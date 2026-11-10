import { NextResponse } from "next/server";
import { staffAuthorized } from "@/lib/staffAuth";
import { addComment, boardReady, createPost, deleteComment, deletePost, listPosts, updatePost } from "@/lib/board";

export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
const notReady = () => NextResponse.json({ error: "게시판 저장소(Upstash Redis)가 연결되지 않았어요." }, { status: 503 });

/** 직원 게시판 목록 */
export async function GET(req: Request) {
  if (!staffAuthorized(req)) return deny();
  if (!boardReady()) return notReady();
  return NextResponse.json({ posts: await listPosts() }, { headers: { "Cache-Control": "no-store" } });
}

/** 글쓰기·수정·삭제·댓글: { op, ... } */
export async function POST(req: Request) {
  if (!staffAuthorized(req)) return deny();
  if (!boardReady()) return notReady();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const id = String(b.id ?? "");
    switch (b.op) {
      case "create": return NextResponse.json({ post: await createPost(b as never) });
      case "update": return NextResponse.json({ post: await updatePost(id, b) });
      case "delete": await deletePost(id); return NextResponse.json({ ok: true });
      case "comment": return NextResponse.json({ post: await addComment(id, b.author, b.body) });
      case "uncomment": return NextResponse.json({ post: await deleteComment(id, String(b.cid ?? "")) });
      default: return NextResponse.json({ error: "알 수 없는 요청이에요." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "저장하지 못했어요." }, { status: 400 });
  }
}
