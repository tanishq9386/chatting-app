import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center flowing-gradient">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">TalkSick</h1>
        <p className="text-2xl mb-8">Connect with your friends instantly</p>
        <Link
          href="/chat"
          className="bg-white text-blue-600 px-10 py-3 rounded-lg font-semibold hover:bg-gray-200 hover:text-lg hover:shadow-[0_0_8px_4px_rgba(190,85,247,0.3)] transition-all"
        >
          Start Chatting
        </Link>
      </div>
    </div>
  );
}