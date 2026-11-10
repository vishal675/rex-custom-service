import { getActivity, type ActivityId } from '@/features/availability/model';

export function meetupTitle(m: { ownerId: string; ownerName: string; activity: ActivityId | null }, myId: string | null) {
  const activity = getActivity(m.activity);
  const what = activity ? `${activity.emoji} ${activity.label}` : 'Hanging out';
  return m.ownerId === myId ? `Your plan · ${what}` : `${m.ownerName.split(' ')[0]} · ${what}`;
}
