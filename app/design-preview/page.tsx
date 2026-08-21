'use client';

import { useState } from 'react';

const quick = [
  ['주간업무', '이번 주 업무 입력', '📅'],
  ['카드사용', '지출 · 검수 관리', '💳'],
  ['차량신청', '예약 및 운행일지', '🚗'],
  ['교통카드', '사용내역 등록', '🚌'],
  ['공문결재', '공문 접수 · 결재', '📄'],
];

const tasks = [
  { title: '카드사용 물품검수', meta: '사진 등록 필요', level: '높음' },
  { title: '8월 4주차 주간업무', meta: '작성 중', level: '보통' },
  { title: '차량 운행일지', meta: '오늘까지 작성', level: '높음' },
];

export default function DesignPreviewPage() {
  const [tab, setTab] = useState<'dashboard' | 'list' | 'form'>('dashboard');

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-800 md:p-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-sky-600">DESIGN REVIEW · TEST PAGE</p>
            <h1 className="text-3xl font-bold tracking-tight">업무포털 디자인 개선안</h1>
            <p className="mt-2 text-slate-500">현재 포털 구조를 유지하면서 정보 우선순위와 공통 UI를 재정비한 시안입니다.</p>
          </div>
          <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {(['dashboard', 'list', 'form'] as const).map((item) => (
              <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === item ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                {item === 'dashboard' ? '홈 대시보드' : item === 'list' ? '목록 화면' : '입력 화면'}
              </button>
            ))}
          </div>
        </header>

        {tab === 'dashboard' && <Dashboard />}
        {tab === 'list' && <ListView />}
        {tab === 'form' && <FormView />}
      </div>
    </main>
  );
}

function Dashboard() {
  return <div className="space-y-6">
    <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 p-7 md:flex md:items-start md:justify-between">
          <div><p className="text-sm font-medium text-sky-600">2026년 8월 21일 · 금요일</p><h2 className="mt-2 text-2xl font-bold">권지현 대리님, 오늘도 좋은 하루입니다.</h2><p className="mt-2 text-slate-500">오늘 처리해야 할 업무를 먼저 확인하세요.</p></div>
          <button className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold md:mt-0">오늘 일정 보기 →</button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-4 md:divide-y-0">
          <Metric n="03" label="처리할 업무" hint="우선 확인" />
          <Metric n="00" label="검수 미완료" hint="정상" />
          <Metric n="01" label="오늘 일정" hint="차량 예약" />
          <Metric n="02" label="승인 대기" hint="확인 필요" />
        </div>
      </div>
      <div className="rounded-3xl bg-slate-900 p-7 text-white shadow-sm"><p className="text-sm text-sky-300">TODAY FOCUS</p><h3 className="mt-2 text-xl font-bold">오늘의 우선 업무</h3><div className="mt-5 space-y-3"><Focus text="카드사용 물품검수 완료" /><Focus text="8월 4주차 주간업무 작성" /><Focus text="6972 차량 운행일지 확인" /></div><button className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">업무 전체 보기</button></div>
    </section>

    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">자주 사용하는 업무</h2><span className="text-sm text-slate-400">필요한 기능으로 바로 이동</span></div><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{quick.map(([title, desc, icon]) => <button key={title} className="group rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"><div className="text-2xl">{icon}</div><h3 className="mt-5 font-bold group-hover:text-sky-600">{title}</h3><p className="mt-1 text-sm text-slate-500">{desc}</p></button>)}</div></section>

    <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Panel title="처리할 업무" action="전체 보기"><div className="divide-y divide-slate-100">{tasks.map((t) => <div key={t.title} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-semibold">{t.title}</p><p className="mt-1 text-sm text-slate-500">{t.meta}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${t.level === '높음' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{t.level}</span></div>)}</div></Panel>
      <Panel title="예정된 일정" action="전체 일정"><div className="space-y-3"><Schedule date="8/21" day="오늘" title="6972 차량 예약 · 도시락 배달" /><Schedule date="8/24" day="월" title="주간회의 · 10:00" /><Schedule date="8/27" day="목" title="사업 결과보고서 제출" /></div></Panel>
    </section>
  </div>;
}

function ListView() { return <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"><div className="border-b border-slate-100 p-7"><p className="text-sm font-semibold text-sky-600">EXPENSE MANAGEMENT</p><div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-bold">카드사용대장</h2><p className="mt-1 text-slate-500">등록 · 검수 · 검수조서를 하나의 흐름으로 관리합니다.</p></div><button className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white">+ 카드사용 등록</button></div></div><div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-5 md:grid-cols-4"><Stat label="전체" value="128건" /><Stat label="검수 필요" value="3건" danger /><Stat label="조서 필요" value="1건" /><Stat label="완료" value="124건" /></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>{['사용일','내용','금액','진행 상태','담당'].map(x=><th key={x} className="px-6 py-4 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{[['08.21','복지프로그램 물품 구입','₩128,000','검수 필요','권지현'],['08.20','급식 식재료 구입','₩1,240,000','검수조서 필요','김OO'],['08.19','사무용품 구입','₩46,500','완료','이OO']].map((r,i)=><tr key={r[0]} className="hover:bg-slate-50/70"><td className="px-6 py-5 font-medium">{r[0]}</td><td className="px-6 py-5">{r[1]}</td><td className="px-6 py-5 font-semibold">{r[2]}</td><td className="px-6 py-5"><span className={`rounded-full px-3 py-1 text-xs font-bold ${i===0?'bg-amber-50 text-amber-700':i===1?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'}`}>{r[3]}</span></td><td className="px-6 py-5 text-slate-500">{r[4]}</td></tr>)}</tbody></table></div></section> }

function FormView(){return <section className="grid gap-6 xl:grid-cols-[1fr_320px]"><div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200"><p className="text-sm font-semibold text-sky-600">NEW EXPENSE</p><h2 className="mt-2 text-2xl font-bold">카드사용 등록</h2><p className="mt-1 text-slate-500">등록 후 필요한 검수 절차가 자동으로 이어집니다.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{['사용일','카드명','사용처','사용금액'].map((x)=><label key={x} className="text-sm font-semibold">{x}<input placeholder={`${x} 입력`} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500" /></label>)}<label className="md:col-span-2 text-sm font-semibold">사용 내용<textarea placeholder="구입 목적과 내용을 입력하세요." className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-sky-500" /></label></div><div className="mt-8 flex justify-end gap-3"><button className="rounded-xl border border-slate-200 px-5 py-3 font-semibold">취소</button><button className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white">다음 단계 →</button></div></div><aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><h3 className="font-bold">업무 진행 과정</h3><div className="mt-6 space-y-0"><Step n="1" title="카드사용 등록" active /><Step n="2" title="물품 검수사진" /><Step n="3" title="100만원 이상 검수조서" /><Step n="4" title="최종 완료" /></div><div className="mt-6 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-sky-800">금액과 사용 유형에 따라 필요한 다음 단계만 안내하도록 구성합니다.</div></aside></section>}

function Metric({n,label,hint}:{n:string,label:string,hint:string}){return <div className="p-5"><div className="text-2xl font-bold">{n}</div><div className="mt-1 font-semibold text-slate-700">{label}</div><div className="mt-1 text-xs text-slate-400">{hint}</div></div>}
function Focus({text}:{text:string}){return <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm"><span className="h-2 w-2 rounded-full bg-sky-300"/>{text}</div>}
function Panel({title,action,children}:{title:string,action:string,children:React.ReactNode}){return <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button className="text-sm font-semibold text-sky-600">{action} →</button></div>{children}</section>}
function Schedule({date,day,title}:{date:string,day:string,title:string}){return <div className="flex items-center gap-4 rounded-2xl border border-slate-100 p-3"><div className="w-12 text-center"><div className="font-bold">{date}</div><div className="text-xs text-slate-400">{day}</div></div><div className="h-8 w-px bg-slate-100"/><p className="font-medium">{title}</p></div>}
function Stat({label,value,danger}:{label:string,value:string,danger?:boolean}){return <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200"><p className="text-sm text-slate-500">{label}</p><p className={`mt-1 text-xl font-bold ${danger?'text-rose-600':''}`}>{value}</p></div>}
function Step({n,title,active}:{n:string,title:string,active?:boolean}){return <div className="flex gap-3 pb-6 last:pb-0"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active?'bg-sky-600 text-white':'bg-slate-100 text-slate-400'}`}>{n}</div><div className="pt-1 text-sm font-semibold">{title}{active&&<span className="ml-2 text-xs text-sky-600">진행 중</span>}</div></div>}
