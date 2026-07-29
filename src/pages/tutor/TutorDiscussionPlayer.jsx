import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DiscussionTab from '../../components/discussion/DiscussionTab';

export default function TutorDiscussionPlayer() {
  const { courseId, lessonId } = useParams();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/tutor-dashboard/discussions"
        className="inline-flex items-center gap-2 text-sm font-bold text-white/50 transition hover:text-violet-400"
      >
        <ArrowLeft size={16} />
        Back to Discussions
      </Link>
      <DiscussionTab courseId={courseId} lessonId={lessonId} />
    </div>
  );
}
