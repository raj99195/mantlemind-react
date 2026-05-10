import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

export default function Navbar() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  return (
    <header className="topnav">

      {/* LEFT LOGO */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: '220px',
        }}
      >
        
        
      </div>

      {/* CENTER WALLET */}
      <div className="topnav-wallet">
        {isConnected ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="live-dot" />

            <button
              onClick={() => open({ view: 'Account' })}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: '12px',
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>

            <button
              onClick={() => open({ view: 'Networks' })}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11px',
                color: '#888',
                cursor: 'pointer',
              }}
            >
              Mantle
            </button>
          </div>
        ) : (
          <button
            onClick={() => open()}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>

         </header>
  );
}