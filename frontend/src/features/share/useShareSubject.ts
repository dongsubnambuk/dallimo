import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getCourseRepository } from '@/entities/course/api';
import { liveRoomRepositoryFor } from '@/entities/live/api';
import { runResultRepository } from '@/entities/run/api';
import type { ShareType } from '@/entities/share/types';
import { useMe } from '@/features/my/useMy';
import { useRunResult } from '@/features/run-result/useRunResult';

import { fromLive, fromRun, type ShareCardData } from './cardModel';

// 링크를 만들 대상. 서버에 올라간 기록만 링크를 만들 수 있다.
export type LinkTarget = { type: ShareType; referenceId: string; courseId: string | null };

export type ShareSubject =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'ready'; data: ShareCardData; live: boolean; link: LinkTarget | null; linkBlocked: string | null };

// 공유 카드를 만들 기록: 러닝 결과(runId) 또는 Live 결과(roomId)
export function useShareSubject(source: { runId: string | null; roomId: string | null }): ShareSubject {
  const me = useMe('normal');
  const nickname = me.data?.profile.nickname ?? '';
  const run = useRunResult(source.runId ?? '');
  const courseRepo = useMemo(() => getCourseRepository('normal'), []);
  const liveRepo = useMemo(() => liveRoomRepositoryFor(source.roomId ?? ''), [source.roomId]);
  const courseId = run.kind === 'ready' ? (run.result.course?.id ?? null) : null;
  const course = useQuery({
    queryKey: ['course', 'detail', courseId, 'normal'],
    queryFn: () => courseRepo.getDetail(courseId as string),
    enabled: courseId != null,
    retry: false,
  });
  const live = useQuery({
    queryKey: ['live', 'result', source.roomId],
    queryFn: () => liveRepo.getResult(source.roomId as string),
    enabled: source.roomId != null,
    retry: 2,
  });
  const myRunId = live.data?.myRunId ?? null;
  const myRun = useQuery({
    queryKey: ['run', 'result', myRunId],
    queryFn: () => runResultRepository.get(myRunId as string),
    enabled: myRunId != null,
    retry: false,
  });

  if (me.isPending) return { kind: 'loading' };
  if (source.roomId) {
    if (live.isPending || (myRunId && myRun.isPending)) return { kind: 'loading' };
    if (!live.data) return { kind: 'notFound' };
    const r = myRun.data ?? null;
    return {
      kind: 'ready',
      data: fromLive(live.data, r, nickname),
      live: true,
      link: r && r.sync === 'synced' ? { type: 'RUN', referenceId: r.id, courseId: null } : null,
      linkBlocked: r && r.sync === 'synced' ? null : '기록을 올린 뒤에 링크를 만들 수 있어요',
    };
  }
  if (run.kind === 'loading' || (courseId && course.isPending)) return { kind: 'loading' };
  if (run.kind === 'notFound') return { kind: 'notFound' };
  const r = run.result;
  const synced = r.sync === 'synced';
  return {
    kind: 'ready',
    data: fromRun(r, course.data ?? null, nickname),
    live: false,
    link: synced ? { type: 'RUN', referenceId: r.id, courseId: r.course?.id ?? null } : null,
    linkBlocked: synced ? null : '기록을 올린 뒤에 링크를 만들 수 있어요',
  };
}
