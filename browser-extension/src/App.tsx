export default function App() {
  return (
    <main className="shell">
      <p className="brand">ScamHelp</p>
      <h1>Active on this page</h1>
      <p className="lede">
        Links are automatically outlined and marked with a green check. No
        analysis runs yet — this is a local visual pass for every link.
      </p>
      <p className="status" role="status">
        Reload the tab after updating the extension to pick up changes.
      </p>
    </main>
  );
}
