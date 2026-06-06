import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-elite-bg)] text-[#f4f4f5] font-sans">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 lg:px-8 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
