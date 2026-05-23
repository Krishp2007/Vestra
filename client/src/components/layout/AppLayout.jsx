import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
        <footer style={{ textAlign: 'center', padding: '20px', fontSize: 13, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          &copy; {new Date().getFullYear()} Vestra. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
