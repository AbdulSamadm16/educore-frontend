const DiscussionReplyList = ({ replies = [], renderReply }) => {
  if (!replies.length) return null;

  return (
    <div className="mt-4 space-y-3 border-l-2 border-gray-200 pl-4 dark:border-white/10">
      {replies.map((reply) => (
        <div key={reply.id || reply._id}>
          {renderReply(reply)}
        </div>
      ))}
    </div>
  );
};

export default DiscussionReplyList;
