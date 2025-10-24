export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
      <div>
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-6 py-3 text-sm flex gap-4">
            <a className="underline" href="/">Dashboard</a>
            <a className="underline" href="/products">Produtos</a>
            <a className="underline" href="/materials">Materiais</a>
            <a className="underline" href="/printing">Impressões</a>
            <a className="underline" href="/finishes">Acabamentos</a>
            <a className="underline" href="/margins">Margens</a>
            <a className="underline" href="/config">Config</a>
            <span className="ml-auto">
              <a className="underline" href="/quotes">Ir para Comercial</a>
            </span>
          </div>
        </header>
        {children}
      </div>
    );
  }
  