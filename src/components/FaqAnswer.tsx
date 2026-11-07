// 자주 묻는 질문 답변: 문단, "- " 목록, "제목 | 설명" 굵은 제목
function Line({ t }: { t: string }) {
  const k = t.indexOf(" | ");
  return k < 0 ? <>{t}</> : <><b>{t.slice(0, k)}</b> {t.slice(k + 3)}</>;
}

export default function FaqAnswer({ a }: { a: string | string[] }) {
  const lines = Array.isArray(a) ? a : [a];
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={`u${out.length}`}>{list.map((l) => <li key={l}><Line t={l} /></li>)}</ul>);
    list = [];
  };
  for (const l of lines) {
    if (l.startsWith("- ")) list.push(l.slice(2));
    else {
      flush();
      out.push(<p key={`p${out.length}`}><Line t={l} /></p>);
    }
  }
  flush();
  return <div className="faq-a">{out}</div>;
}
