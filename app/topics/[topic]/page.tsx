import { TOPICS } from "@/data/words";
import TopicClient from "./TopicClient";

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ topic: topic.id }));
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  return <TopicClient topicId={topic} />;
}
