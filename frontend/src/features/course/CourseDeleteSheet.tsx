import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getCourseRepository } from '@/entities/course/api';
import { ConfirmSheet } from '@/features/settings/components/ConfirmSheet';
import { formatCount } from '@/shared/format';

// 내 코스 지우기 확인 (결정 로그 90항). 지워도 이 코스를 달린 사람들의 러닝 기록은 기록 탭에 남는다 (22.3장).
// otherFinishers: 나 말고 이 코스를 완주한 사람 수 (모르면 null). note: 맨 앞에 붙일 안내 (숨겨진 코스 등)
export function CourseDeleteSheet({
  courseId,
  name,
  otherFinishers,
  note,
  onDeleted,
  onClose,
}: {
  courseId: string;
  name: string;
  otherFinishers: number | null;
  note?: string;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const repo = useMemo(() => getCourseRepository('normal'), []);
  const remove = useMutation({
    mutationFn: () => repo.remove(courseId),
    onSuccess: () => {
      onDeleted();
      // 지운 코스의 상세는 다시 불러오지 않는다 (불러오면 "볼 수 없는 코스"가 잠깐 보인다)
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] === 'course' || q.queryKey[0] === 'courses') && q.queryKey[2] !== courseId });
    },
  });

  const others = otherFinishers && otherFinishers > 0 ? `${formatCount(otherFinishers)}명이 완주한 코스예요. ` : '';
  return (
    <ConfirmSheet
      title={`'${name}' 코스를 지울까요?`}
      body={`${note ? `${note} ` : ''}${others}탐색과 랭킹에서 사라지고 되돌릴 수 없어요. 이 코스를 달린 러닝 기록은 각자의 기록 탭에 그대로 남아요.`}
      confirmLabel="코스 지우기"
      danger
      busy={remove.isPending}
      error={remove.isError ? '지우지 못했어요. 연결을 확인하고 다시 시도해 주세요.' : null}
      onConfirm={() => remove.mutate()}
      onClose={onClose}
    />
  );
}
