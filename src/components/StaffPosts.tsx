"use client";
// 직원 게시판 (전체 공지 + 지점별). 공용 비밀번호라 작성자는 이름을 골라서 남긴다.
import { useCallback, useEffect, useState } from "react";

type Comment = { id: string; author: string; body: string; at: string };
type Post = { id: string; board: string; author: string; title: string; body: string; pinned: boolean; at: string; edited?: string; comments: Comment[] };

const BOARDS: [string, string][] = [
  ["all", "전체 공지"], ["main", "온기PT&근막이완"], ["priv", "온기 근막이완"], ["sbp", "신반포스퀘어점"], ["sl", "선릉점"],
];
const BOARD_NAME = Object.fromEntries(BOARDS);
const WRITERS = ["현승민", "배태성", "황사라", "김나영", "송효재", "이정민", "허재성", "김정화"];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const when = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()} (${DOW[d.getUTCDay()]}) ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};
const AKEY = "ongi-staff-author";
const readAuthor = () => { try { return localStorage.getItem(AKEY) ?? ""; } catch { return ""; } };
const keepAuthor = (v: string) => { try { localStorage.setItem(AKEY, v); } catch { /* 저장 안 돼도 됨 */ } };

export default function StaffPosts({ staffKey }: { staffKey: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState("");
  const [board, setBoard] = useState("*");
  const [author, setAuthor] = useState("");
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ board: "all", title: "", body: "", pinned: false });
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", body: "" });
  const [reply, setReply] = useState<Record<string, string>>({});

  useEffect(() => setAuthor(readAuthor()), []);
  const pickAuthor = (v: string) => { setAuthor(v); keepAuthor(v); };

  const load = useCallback(() => {
    fetch("/api/staff/board", { headers: { "x-staff-key": staffKey } })
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : (setErr(""), setPosts(j.posts))))
      .catch(() => setErr("게시판을 불러오지 못했어요."));
  }, [staffKey]);
  useEffect(() => { load(); }, [load]);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/staff/board", { method: "POST", headers: { "x-staff-key": staffKey, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.error) { setErr(j.error); return false; }
      load();
      return true;
    } catch { setErr("저장하지 못했어요. 다시 시도해 주세요."); return false; }
    finally { setBusy(false); }
  };

  const submit = async () => {
    if (await send({ op: "create", author, ...form })) {
      setForm({ board: form.board, title: "", body: "", pinned: false });
      setWriting(false);
      setBoard(form.board);
    }
  };

  const list = (posts ?? []).filter((p) => board === "*" || p.board === board);
  const count = (id: string) => (posts ?? []).filter((p) => p.board === id).length;

  return (
    <>
      <div className="bd-top">
        <label className="bd-me">작성자
          <select value={author} onChange={(e) => pickAuthor(e.target.value)}>
            <option value="">이름 선택</option>
            {WRITERS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </label>
        <button className="primary" onClick={() => { setWriting(!writing); setForm((f) => ({ ...f, board: board === "*" ? "all" : board })); }}>{writing ? "닫기" : "✏️ 글쓰기"}</button>
      </div>

      {writing && (
        <div className="branch bd-form">
          <div className="chips">
            {BOARDS.map(([id, name]) => (
              <button key={id} className="chip" aria-pressed={form.board === id} onClick={() => setForm({ ...form, board: id })}>{name}</button>
            ))}
          </div>
          <input placeholder="제목" value={form.title} maxLength={100} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="내용" rows={6} value={form.body} maxLength={5000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <label className="bd-pin"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> 맨 위에 고정</label>
          {!author && <p className="vnote">위에서 작성자 이름을 먼저 골라 주세요.</p>}
          <button className="primary" disabled={busy || !author || (!form.title.trim() && !form.body.trim())} onClick={submit}>{busy ? "올리는 중…" : "올리기"}</button>
        </div>
      )}

      <div className="chips bd-tabs">
        <button className="chip" aria-pressed={board === "*"} onClick={() => setBoard("*")}>전체 보기</button>
        {BOARDS.map(([id, name]) => (
          <button key={id} className="chip" aria-pressed={board === id} onClick={() => setBoard(id)}>
            {name} <small>{count(id)}</small>
          </button>
        ))}
      </div>

      {err && <div className="err">{err}</div>}
      {!posts && !err && <p className="vnote">불러오는 중…</p>}

      <ul className="bd-list">
        {list.map((p) => (
          <li key={p.id} className={p.pinned ? "pinned" : ""}>
            <div className="voc-meta">
              <span className={`bd-board b-${p.board}`}>{BOARD_NAME[p.board] ?? p.board}</span>
              {p.pinned && <span className="bd-pinmark">📌 고정</span>}
              <span>{p.author}</span>
              <span>{when(p.at)}{p.edited ? " (수정됨)" : ""}</span>
            </div>
            {editing === p.id ? (
              <div className="bd-form">
                <input value={edit.title} maxLength={100} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                <textarea rows={6} value={edit.body} maxLength={5000} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                <div className="bd-acts">
                  <button className="primary" disabled={busy} onClick={async () => { if (await send({ op: "update", id: p.id, ...edit })) setEditing(null); }}>저장</button>
                  <button className="ghost" onClick={() => setEditing(null)}>취소</button>
                </div>
              </div>
            ) : (
              <>
                {p.title && <b className="voc-title">{p.title}</b>}
                {p.body && <p>{p.body}</p>}
              </>
            )}
            <div className="bd-acts small">
              <button onClick={() => send({ op: "update", id: p.id, pinned: !p.pinned })}>{p.pinned ? "고정 해제" : "고정"}</button>
              <button onClick={() => { setEditing(p.id); setEdit({ title: p.title, body: p.body }); }}>수정</button>
              <button onClick={() => { if (window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) send({ op: "delete", id: p.id }); }}>삭제</button>
            </div>
            <div className="bd-comments">
              {p.comments.map((c) => (
                <div key={c.id} className="bd-c">
                  <b>{c.author}</b> <span>{c.body}</span> <small>{when(c.at)}</small>
                  <button aria-label="댓글 삭제" onClick={() => { if (window.confirm("댓글을 삭제할까요?")) send({ op: "uncomment", id: p.id, cid: c.id }); }}>×</button>
                </div>
              ))}
              <div className="bd-reply">
                <input placeholder={author ? "댓글 달기" : "작성자를 먼저 골라 주세요"} disabled={!author} value={reply[p.id] ?? ""} maxLength={1000}
                  onChange={(e) => setReply({ ...reply, [p.id]: e.target.value })}
                  onKeyDown={async (e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && (reply[p.id] ?? "").trim()) { if (await send({ op: "comment", id: p.id, author, body: reply[p.id] })) setReply({ ...reply, [p.id]: "" }); } }} />
                <button className="ghost" disabled={!author || busy || !(reply[p.id] ?? "").trim()} onClick={async () => { if (await send({ op: "comment", id: p.id, author, body: reply[p.id] })) setReply({ ...reply, [p.id]: "" }); }}>등록</button>
              </div>
            </div>
          </li>
        ))}
        {posts && !list.length && <p className="vnote">아직 글이 없어요.</p>}
      </ul>
    </>
  );
}
