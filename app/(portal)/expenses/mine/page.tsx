import { Fragment } from 'react';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { getSystemSettings } from '@/lib/mutate/settings';
import { getViewerStaffRecord, requireViewerEmail } from '@/lib/auth-helpers';
import { BUDGET_ITEM_TABLE, ITEM_CHECK_PHOTO_SLOTS } from '@/lib/sheets/registry';
import {
  badgeBase, badgeTone, btn, btnDanger, btnSecondary, card, cardTableWrap,
  input, inputBase, label, selectFilter, tableClean, tdClean, thClean, trHoverClean,
} from '@/lib/ui';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import TrashIcon from '@/components/icons/TrashIcon';
import CardLedgerEntryFields from '@/components/expenses/CardLedgerEntryFields';
import CardLedgerSplitLayout from '@/components/expenses/CardLedgerSplitLayout';
import CardTypeTabs from '@/components/expenses/CardTypeTabs';
import ReportItemsFields from '@/components/expenses/ReportItemsFields';
import CameraGalleryFileInput from '@/components/expenses/CameraGalleryFileInput';
import ApprovalChainSteps from '@/components/expenses/ApprovalChainSteps';
import { buildApprovalSteps, parseReportItems } from '@/lib/mutate/itemCheckReport';
import { getStaffList } from '@/lib/mutate/staff';
import { parseAmount, resolveBusinessName } from '@/lib/format';
import { addCardLedgerAction, deleteCardLedgerAction, updateCardLedgerAction } from '../actions';
import { deleteItemCheckPhotoAction, saveItemCheckPhotoAction } from '../photos/actions';
import { addItemCheckReportAction, deleteItemCheckReportAction, updateItemCheckReportAction } from '../reports/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const iconBtnDanger =
  'inline-flex items-center justify-center rounded-md p-1.5 text-[#b51c31] transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
}

function dayBadge(days: number, warnDays: number, dangerDays: number) {
  const tone = days >= dangerDays ? badgeTone.red : days >= warnDays ? badgeTone.amber : badgeTone.gray;
  return <span className={`${badgeBase} ${tone}`}>{days}일</span>;
}

export default async function CardLedgerMinePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string; focus?: string; edit?: string; ym?: string; all?: string;
    photoFor?: string; photoEdit?: string;
    reportFor?: string; reportEdit?: string;
  }>;
}) {
  const { status, focus, edit, ym, all, photoFor, photoEdit, reportFor, reportEdit } = await searchParams;
  const viewerEmail = await requireViewerEmail();
  const [allLedger, photos, reports, budgetItems, settings, me, staffList] = await Promise.all([
    getCardLedgerList(),
    getItemCheckPhotoList(),
    getItemCheckReportList(),
    getKeyedList(BUDGET_ITEM_TABLE),
    getSystemSettings(),
    getViewerStaffRecord(),
    getStaffList(),
  ]);

  const editing = edit ? allLedger.find((r) => r.id === edit) : null;

  const currentYm = todayKst().slice(0, 7);
  const showAll = all === '1';
  const activeYm = showAll ? '' : (ym || currentYm);

  const mine = allLedger
    .filter((r) => (r.담당자이메일 ?? '').toLowerCase() === viewerEmail)
    .filter((r) => !activeYm || r.사용일자.startsWith(activeYm))
    .sort((a, b) => (b.사용일자 || '').localeCompare(a.사용일자 || '') || (b.등록일시 || '').localeCompare(a.등록일시 || ''));

  const photoByLedgerId = new Map(photos.map((p) => [p.카드사용대장ID, p]));
  const reportByLedgerId = new Map(reports.map((r) => [r.카드사용대장ID, r]));

  const rows = mine.filter((r) => {
    const exempt = r.검수불요여부 === 'Y';
    const hasPhoto = photoByLedgerId.has(r.id);
    const reportRequired = !exempt && settings.itemCheckReportThreshold > 0 && parseAmount(r.사용금액) >= settings.itemCheckReportThreshold;
    const hasReport = reportByLedgerId.has(r.id);
    if (status === 'photoMissing') return !exempt && !hasPhoto;
    if (status === 'reportMissing') return reportRequired && !hasReport;
    return true;
  });

  const statusQuery = status ? `&status=${status}` : '';

  // 행 클릭/사진·조서 등록 링크는 지금 걸려있는 월/전체보기/상태 필터를 그대로 들고 다녀야 한다 —
  // 안 그러면 "전체보기"로 예전 달 항목을 클릭했는데 수정 화면으로 넘어가면서 기본 필터(이번달)로
  // 되돌아가버려 방금 클릭한 행을 포함한 목록 전체가 사라진 것처럼 보인다.
  function buildQuery(params: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (ym) sp.set('ym', ym);
    if (all) sp.set('all', all);
    if (status) sp.set('status', status);
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
    }
    const qs = sp.toString();
    return `/expenses/mine${qs ? `?${qs}` : ''}`;
  }
  const backHref = buildQuery({});
  const filterHiddenFields = (
    <>
      {ym && <input type="hidden" name="ym" value={ym} />}
      {showAll && <input type="hidden" name="all" value="1" />}
      {status && <input type="hidden" name="status" value={status} />}
    </>
  );

  const entryForm = (
    <form key={edit ?? 'new'} action={editing ? updateCardLedgerAction : addCardLedgerAction} className="flex flex-col gap-3">
      {filterHiddenFields}
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <label className={label}>
        구분 *
        <CardTypeTabs defaultValue={editing?.구분 ?? '체크카드'} />
      </label>
      <label className={label}>
        사용일자 *
        <input type="date" name="date" defaultValue={editing?.사용일자 ?? todayKst()} required className={input} />
      </label>
      <label className={label}>
        담당자명
        <input name="name" defaultValue={editing?.담당자명 ?? me?.성명 ?? ''} className={input} />
      </label>
      <label className={label}>
        예산과목 *
        <input
          name="budgetItem"
          list="budget-item-options"
          defaultValue={editing?.예산과목 ?? ''}
          placeholder="입력해서 검색"
          autoComplete="off"
          required
          className={input}
        />
        <datalist id="budget-item-options">
          {budgetItems.map((b) => (
            <option key={b.예산과목명} value={b.예산과목명}>
              {b.연계사업명 ? `${b.예산과목명} · ${b.연계사업명}` : b.예산과목명}
            </option>
          ))}
        </datalist>
      </label>
      <CardLedgerEntryFields
        defaultAmount={editing?.사용금액}
        defaultExempt={editing?.검수불요여부 === 'Y'}
        defaultExemptReason={editing?.검수불요사유}
        reportThreshold={settings.itemCheckReportThreshold}
      />
      <label className={label}>
        카드번호(뒤 4자리)
        <input name="cardNo" defaultValue={editing?.카드번호 ?? ''} maxLength={4} className={input} />
      </label>
      <label className={label}>
        사용내역 *
        <input name="description" defaultValue={editing?.사용내역 ?? ''} required className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
        {editing && <a href={backHref} className="text-xs text-zinc-500 hover:underline">취소</a>}
      </div>
    </form>
  );

  return (
    <CardLedgerSplitLayout
      formLabel={editing ? '카드사용 내역 수정' : '카드사용 입력'}
      editKey={edit}
      form={entryForm}
    >
        <form method="get" className="flex items-center gap-1.5 mb-3 flex-wrap">
          <a
            href={`/expenses/mine${statusQuery ? `?${statusQuery.slice(1)}` : ''}`}
            className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
          >
            이번달
          </a>
          <input type="month" name="ym" defaultValue={ym || currentYm} className={`${inputBase} w-auto text-xs py-1`} />
          <a
            href={`/expenses/mine?all=1${statusQuery}`}
            className={`text-xs px-2.5 py-1 rounded-full ${showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
          >
            전체보기
          </a>
          <select name="status" defaultValue={status ?? 'all'} className={selectFilter}>
            <option value="all">전체 상태</option>
            <option value="photoMissing">사진 미등록</option>
            <option value="reportMissing">조서 미등록</option>
          </select>
          <button type="submit" className={btnSecondary}>조회</button>
          <span className="text-xs text-zinc-400">경과일 경고 {settings.cardLedgerWarnDays}일 / 위험 {settings.cardLedgerDangerDays}일</span>
        </form>

        <div className={cardTableWrap}><table className={tableClean}>
        <thead>
          <tr>
            <th className={thClean}>사용일자</th><th className={thClean}>사업명/사용내역</th>
            <th className={thClean}>사용금액</th><th className={thClean}>경과</th><th className={thClean}>상태</th><th className={thClean}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const exempt = r.검수불요여부 === 'Y';
            const locked = r.상태 === '인쇄완료';
            const hasPhoto = photoByLedgerId.has(r.id);
            const photo = photoByLedgerId.get(r.id);
            const reportRequired = !exempt && settings.itemCheckReportThreshold > 0 && parseAmount(r.사용금액) >= settings.itemCheckReportThreshold;
            const hasReport = reportByLedgerId.has(r.id);
            const report = reportByLedgerId.get(r.id);

            let expand: 'photoNew' | 'photoEdit' | 'reportNew' | 'reportEdit' | null = null;
            if (photoEdit === r.id) expand = 'photoEdit';
            else if (photoFor === r.id) expand = 'photoNew';
            else if (reportEdit === r.id) expand = 'reportEdit';
            else if (reportFor === r.id) expand = 'reportNew';
            else if (focus === r.id && !exempt && !locked) {
              if (!hasPhoto) expand = 'photoNew';
              else if (reportRequired && !hasReport) expand = 'reportNew';
              // 조서를 방금 제출한 직후(포커스만 남고 미등록 조건은 더 이상 안 맞음) — 결재 진행 상황이
              // 바로 보이도록 등록 폼 대신 수정(조회) 화면을 펼친다.
              else if (reportRequired && hasReport) expand = 'reportEdit';
            }

            return (
              <Fragment key={r.id}>
                <tr className={trHoverClean}>
                  <td className={tdClean}>
                    {locked ? r.사용일자 : <a href={buildQuery({ edit: r.id })} className="block">{r.사용일자}</a>}
                  </td>
                  <td className={tdClean}>
                    {locked ? (
                      <>
                        <div className="font-medium">{resolveBusinessName(r.예산과목, budgetItems)}</div>
                        <div className="text-xs text-zinc-500">{r.사용내역}</div>
                      </>
                    ) : (
                      <a href={buildQuery({ edit: r.id })} className="block">
                        <div className="font-medium">{resolveBusinessName(r.예산과목, budgetItems)}</div>
                        <div className="text-xs text-zinc-500">{r.사용내역}</div>
                      </a>
                    )}
                    {r.상태 === '반려' && <div className="text-xs text-[#b51c31] mt-0.5">반려 사유: {r.반려사유}</div>}
                  </td>
                  <td className={tdClean}>
                    {locked ? `${parseAmount(r.사용금액).toLocaleString()}원` : (
                      <a href={buildQuery({ edit: r.id })} className="block">{parseAmount(r.사용금액).toLocaleString()}원</a>
                    )}
                  </td>
                  <td className={tdClean}>{exempt || locked || r.상태 === '검수완료' ? '' : dayBadge(daysSince(r.사용일자), settings.cardLedgerWarnDays, settings.cardLedgerDangerDays)}</td>
                  <td className={`${tdClean}`}>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {exempt ? (
                        <span className={`${badgeBase} ${badgeTone.gray}`}>검수불요</span>
                      ) : locked ? (
                        <span className={`${badgeBase} ${badgeTone.blue}`}>인쇄완료</span>
                      ) : r.상태 === '검수완료' ? (
                        <a href={buildQuery({ photoEdit: r.id })} className={`${badgeBase} ${badgeTone.green} hover:underline`}>검수완료</a>
                      ) : (
                        <>
                          {hasPhoto ? (
                            <a href={buildQuery({ photoEdit: r.id })} className={`${badgeBase} ${badgeTone.green} hover:underline`}>사진 완료</a>
                          ) : (
                            <a href={buildQuery({ photoFor: r.id })} className={`${badgeBase} ${badgeTone.red} hover:underline`}>사진 등록</a>
                          )}
                          {reportRequired && (
                            hasReport ? (
                              <a href={buildQuery({ reportEdit: r.id })} className={`${badgeBase} ${badgeTone.green} hover:underline`}>조서 완료</a>
                            ) : (
                              <a href={buildQuery({ reportFor: r.id })} className={`${badgeBase} ${badgeTone.red} hover:underline`}>조서 등록</a>
                            )
                          )}
                          {r.상태 === '반려' && <span className={`${badgeBase} ${badgeTone.red}`}>반려</span>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className={`${tdClean} flex gap-1`}>
                    {!locked && (
                      <form action={deleteCardLedgerAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmSubmitButton confirmMessage="이 내역을 삭제하시겠습니까?" title="삭제" className={iconBtnDanger}>
                          <TrashIcon className="h-4 w-4" />
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
                {expand === 'photoNew' && (
                  <tr>
                    <td colSpan={6} className="p-0 border border-[#e3e6ea] dark:border-zinc-800">
                      <PhotoForm ledgerId={r.id} budgetItems={budgetItems} ledger={r} backHref={backHref} filterHiddenFields={filterHiddenFields} />
                    </td>
                  </tr>
                )}
                {expand === 'photoEdit' && photo && (
                  <tr>
                    <td colSpan={6} className="p-0 border border-[#e3e6ea] dark:border-zinc-800">
                      <PhotoForm ledgerId={r.id} budgetItems={budgetItems} ledger={r} editing={photo} backHref={backHref} filterHiddenFields={filterHiddenFields} />
                    </td>
                  </tr>
                )}
                {expand === 'reportNew' && (
                  <tr>
                    <td colSpan={6} className="p-0 border border-[#e3e6ea] dark:border-zinc-800">
                      <ReportForm ledgerId={r.id} ledger={r} backHref={backHref} filterHiddenFields={filterHiddenFields} staffList={staffList} />
                    </td>
                  </tr>
                )}
                {expand === 'reportEdit' && report && (
                  <tr>
                    <td colSpan={6} className="p-0 border border-[#e3e6ea] dark:border-zinc-800">
                      <ReportForm ledgerId={r.id} ledger={r} editing={report} backHref={backHref} filterHiddenFields={filterHiddenFields} staffList={staffList} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className={`${tdClean} text-center text-zinc-400`}>내역이 없습니다.</td></tr>
          )}
        </tbody>
      </table></div>
    </CardLedgerSplitLayout>
  );
}

function PhotoForm({
  ledgerId, budgetItems, ledger, editing, backHref, filterHiddenFields,
}: {
  ledgerId: string;
  budgetItems: Record<string, string>[];
  ledger: Record<string, string>;
  editing?: Record<string, string>;
  backHref: string;
  filterHiddenFields: React.ReactNode;
}) {
  return (
    <form action={saveItemCheckPhotoAction} encType="multipart/form-data" className={`${card} m-2 grid grid-cols-2 gap-3`}>
      {filterHiddenFields}
      <input type="hidden" name="ledgerId" value={ledgerId} />
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <p className="col-span-2 text-sm font-semibold -mb-1">물품검수사진 {editing ? '수정' : '등록'}</p>
      <label className={label}>
        사업명
        <input name="business" defaultValue={editing?.사업명 ?? resolveBusinessName(ledger.예산과목, budgetItems)} className={input} />
      </label>
      <label className={label}>
        프로그램명
        <input name="program" defaultValue={editing?.프로그램명 ?? ledger.사용내역} className={input} />
      </label>
      <label className={label}>
        지출일자
        <input type="date" name="date" defaultValue={editing?.지출일자 ?? ledger.사용일자} className={input} />
      </label>
      <label className={label}>
        금액
        <input type="number" name="amount" defaultValue={editing?.금액 ?? ledger.사용금액} className={input} />
      </label>
      <label className={`${label} col-span-2`}>
        품명
        <input name="itemName" defaultValue={editing?.품명 ?? ''} className={input} />
      </label>
      {ITEM_CHECK_PHOTO_SLOTS.map((slot) => (
        <div key={slot} className={label}>
          {slot}
          <CameraGalleryFileInput name={slot} existingUrl={editing?.[slot]} />
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3">
        <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
        <a href={backHref} className="text-xs text-zinc-500 hover:underline">닫기</a>
        {editing && (
          <form action={deleteItemCheckPhotoAction} className="inline">
            <input type="hidden" name="id" value={editing.id} />
            <ConfirmSubmitButton confirmMessage="사진 등록 내역을 삭제하시겠습니까?" className={btnDanger}>삭제</ConfirmSubmitButton>
          </form>
        )}
      </div>
    </form>
  );
}

function ReportForm({
  ledgerId, ledger, editing, backHref, filterHiddenFields, staffList,
}: {
  ledgerId: string;
  ledger: Record<string, string>;
  editing?: Record<string, string>;
  backHref: string;
  filterHiddenFields: React.ReactNode;
  staffList: Record<string, string>[];
}) {
  return (
    <form action={editing ? updateItemCheckReportAction : addItemCheckReportAction} className={`${card} m-2 grid grid-cols-2 gap-3`}>
      {filterHiddenFields}
      <input type="hidden" name="ledgerId" value={ledgerId} />
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <p className="col-span-2 text-sm font-semibold -mb-1">
        물품검수조서 {editing ? '수정' : '등록'} <span className="font-normal text-zinc-500">({parseAmount(ledger.사용금액).toLocaleString()}원 · 100만원 이상 건)</span>
      </p>

      {editing && (
        <div className="col-span-2 rounded-md border border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900/50">
          <p className="text-xs font-semibold mb-2 text-zinc-600 dark:text-zinc-300">결재 진행 상황</p>
          <ApprovalChainSteps steps={buildApprovalSteps(editing, staffList)} report={editing} />
        </div>
      )}
      <label className={label}>
        품명 *
        <input name="itemName" defaultValue={editing?.품명 ?? ledger.사용내역 ?? ''} required className={input} />
      </label>
      <label className={label}>
        등록구분 *
        <select name="registerType" defaultValue={editing?.등록구분 ?? '비대상'} className={input}>
          <option value="비대상">비대상</option>
          <option value="등록대상">등록대상</option>
        </select>
      </label>
      <label className={label}>
        비품등록번호
        <input
          defaultValue={editing?.비품등록번호 || ''}
          placeholder={editing?.비품등록번호 ? '' : '물품출납원이 승인 단계에서 입력합니다'}
          disabled
          className={`${input} disabled:text-zinc-400 disabled:bg-zinc-50 dark:disabled:bg-zinc-800/50`}
        />
      </label>
      <div className="col-span-2 grid grid-cols-3 gap-3">
        <label className={label}>
          납품처상호
          <input name="vendorName" defaultValue={editing?.납품처상호 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품처대표자
          <input name="vendorOwner" defaultValue={editing?.납품처대표자 ?? ''} className={input} />
        </label>
        <label className={label}>
          계약금액
          <input type="number" name="contractAmount" defaultValue={editing?.계약금액 ?? ''} className={input} />
        </label>
      </div>
      <div className="col-span-2 grid grid-cols-3 gap-3">
        <label className={label}>
          계약체결년월일
          <input type="date" name="contractDate" defaultValue={editing?.계약체결년월일 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품기한
          <input type="date" name="deliveryDue" defaultValue={editing?.납품기한 ?? ''} className={input} />
        </label>
        <label className={label}>
          납품완료일자
          <input type="date" name="deliveryDate" defaultValue={editing?.납품완료일자 ?? ledger.사용일자 ?? ''} className={input} />
        </label>
      </div>
      <label className={label}>
        검수년월일
        <input type="date" name="checkDate" defaultValue={editing?.검수년월일 ?? ''} className={input} />
      </label>
      <label className={label}>
        검수장소
        <input name="checkPlace" defaultValue={editing?.검수장소 ?? ''} className={input} />
      </label>
      <ReportItemsFields
        defaultItems={
          editing
            ? parseReportItems(editing.품목목록JSON).length > 0
              ? parseReportItems(editing.품목목록JSON)
              : [{ 품목명: editing.품목명 ?? '', 규격: editing.규격 ?? '', 단위: editing.단위 ?? '', 수량: editing.수량 ?? '', 단가: editing.단가 ?? '', 금액: editing.금액 ?? '' }]
            : [{ 품목명: '', 규격: '', 단위: '', 수량: '1', 단가: '', 금액: ledger.사용금액 ?? '' }]
        }
      />
      <label className={`${label} col-span-2`}>
        비고
        <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button type="submit" className={btn}>{editing ? '저장' : '제출'}</button>
        <a href={backHref} className="text-xs text-zinc-500 hover:underline">닫기</a>
        {editing && (
          <form action={deleteItemCheckReportAction} className="inline">
            <input type="hidden" name="id" value={editing.id} />
            <ConfirmSubmitButton confirmMessage="물품검수조서를 삭제하시겠습니까?" className={btnDanger}>삭제</ConfirmSubmitButton>
          </form>
        )}
      </div>
    </form>
  );
}
