export default function NotFound() {
  return (
    <div className="page-shell flex flex-col items-center justify-center px-4 text-center">
      <p className="font-brand text-5xl text-ink">404</p>
      <p className="mt-3 text-muted">This page could not be found.</p>
      <a href="/stays" className="btn btn-dark mt-6">
        Browse stays
      </a>
    </div>
  );
}
