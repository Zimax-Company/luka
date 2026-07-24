import { NextRequest, NextResponse } from 'next/server';
import { getActor } from '@/lib/actor';
import { canAccessAccount } from '@/lib/access';
import { getCategoryModel } from '@/lib/categorizeStore';
import { suggestCategories } from '@/lib/categorize';

// GET /api/entries/suggest-category?accountId=&type=&note=&amount=
// Suggests likely categories for a would-be entry, learned from the account's
// own history. Access-gated to the account.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type');
    const note = searchParams.get('note');
    const amount = parseFloat(searchParams.get('amount') || '0') || 0;

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId is required' }, { status: 400 });
    }
    if (!(await canAccessAccount(actor, accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const model = await getCategoryModel(accountId);
    const suggestions = suggestCategories(
      model,
      { note, amount, type: type === 'INCOME' || type === 'EXPENSE' ? type : undefined },
      3,
    );

    return NextResponse.json({ success: true, data: { suggestions } });
  } catch (error) {
    console.error('Error in GET /api/entries/suggest-category:', error);
    return NextResponse.json({ success: false, error: 'Failed to suggest category' }, { status: 500 });
  }
}
