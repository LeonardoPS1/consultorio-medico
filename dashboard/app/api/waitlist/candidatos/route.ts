"use server";

import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { waitlistService } from '@/lib/services/waitlist';

// GET /api/waitlist/candidatos?medicoId=xxx&turnoFecha=xxxx&turnoHora=xxxx
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);
  const medicoId = searchParams.get('medicoId');

  if (!medicoId) {
    return success({ data: [] });
  }

  const candidatos = await waitlistService.buscarCandidato(medicoId);
  return success({ data: candidatos || [] });
});