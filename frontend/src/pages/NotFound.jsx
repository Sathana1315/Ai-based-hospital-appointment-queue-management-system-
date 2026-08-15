import React from 'react';

const NotFound = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)', textAlign: 'center'
  }}>
    <h1 style={{ fontSize: '6rem', fontFamily: 'var(--font-display)', color: 'var(--color-accent)', margin: 0, lineHeight: 1 }}>404</h1>
    <h2 style={{ fontSize: '2rem', marginTop: 10 }}>Page Not Found</h2>
    <p style={{ color: 'var(--text-secondary)', marginTop: 10 }}>The requested resource could not be found.</p>
    <a href="/" className="btn-primary" style={{ marginTop: 24, textDecoration: 'none', padding: '10px 20px' }}>Go Home</a>
  </div>
);

export default NotFound;
