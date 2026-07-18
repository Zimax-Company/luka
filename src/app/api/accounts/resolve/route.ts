import { NextRequest, NextResponse } from 'next/server';
import { getActor } from '@/lib/actor';
import { resolveHandle } from '@/lib/handle';

// GET /api/accounts/resolve?handle=@anyirah — preview which account a handle
// points to (so the sender UI can confirm the recipient before sending).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const handle = new URL(request.url).searchParams.get('handle') ?? '';
    const to = await resolveHandle(handle);
    return NextResponse.json({
      success: true,
      data: to ? { id: to.id, name: to.name, handle: to.handle } : null,
    });
  } catch (error) {
    console.error('Error in GET /api/accounts/resolve:', error);
    return NextResponse.json({ success: false, error: 'Failed to resolve handle' }, { status: 500 });
  }
}
