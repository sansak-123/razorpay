import { NextResponse } from "next/server";
import { getOrCreateLatestRun } from "@/lib/db/runs";
import { getChatHistory, saveChatMessage } from "@/lib/db/chat";
import { answerSettlementQuestion } from "@/lib/qaAgent";
import { createClient } from "@/lib/supabase/server";

async function requireUserOr401() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireUserOr401();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const history = await getChatHistory(user.id);
  return NextResponse.json({ history });
}

export async function POST(request: Request) {
  try {
    const user = await requireUserOr401();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { question } = await request.json();
    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const { report, data } = await getOrCreateLatestRun(user.id);
    const { answer, aiAnswered } = await answerSettlementQuestion(
      question,
      report,
      data.orders,
      data.settlementLines
    );

    await saveChatMessage(user.id, "user", question);
    await saveChatMessage(user.id, "assistant", answer, aiAnswered);

    return NextResponse.json({ answer, aiAnswered });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
