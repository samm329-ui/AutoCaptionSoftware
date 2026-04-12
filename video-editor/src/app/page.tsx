"use client";

import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/features/editor'), { 
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function Home() {
  return <Editor />;
}