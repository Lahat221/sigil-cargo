import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

// Endpoint de diagnostic TEMPORAIRE — à supprimer une fois le problème
// NEXT_PUBLIC_BRAND résolu. Ne contient aucune donnée secrète (juste le nom
// de la variable et le slug de marque résolu).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rawEnvValue: process.env.NEXT_PUBLIC_BRAND ?? null,
    rawEnvValueLength: process.env.NEXT_PUBLIC_BRAND?.length ?? null,
    rawEnvValueJson: JSON.stringify(process.env.NEXT_PUBLIC_BRAND ?? null),
    resolvedBrandSlug: BRAND.slug,
    resolvedBrandNom: BRAND.nom,
  });
}
