import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { authorSelect, serializeUser } from "@/lib/serializers";
import { FeedClient } from "@/components/FeedClient";

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: authorSelect });
  if (!user) redirect("/api/auth/logout");

  return <FeedClient me={serializeUser(user)} />;
}
