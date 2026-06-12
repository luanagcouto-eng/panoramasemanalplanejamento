import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetadata } from "@/lib/odata/client";

/**
 * Introspeccao do feed ProjectData (`$metadata`) do PWA — usado durante o
 * desenvolvimento da Fase 2 para descobrir os entity sets/campos disponiveis.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const xml = await getMetadata();
    return new NextResponse(xml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 502 },
    );
  }
}
