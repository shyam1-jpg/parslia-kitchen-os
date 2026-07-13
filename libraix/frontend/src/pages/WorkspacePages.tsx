import { Link } from "react-router-dom";

function Soon({ title, tagline }: { title: string; tagline: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ opacity: 0.7, fontSize: 13, letterSpacing: 1 }}>COMING SOON</p>
        <h1 style={{ margin: "0 0 10px" }}>{title}</h1>
        <p style={{ opacity: 0.75, margin: "0 0 22px" }}>{tagline}</p>
        <Link to="/app" className="btn btn-primary">Back to Chat</Link>
      </div>
    </div>
  );
}

export const SearchWorkspace = () => <Soon title="Libraix Search" tagline="Web research with real citations, fast search and deep research modes." />;
export const LibraryWorkspace = () => <Soon title="Libraix Library" tagline="One home for every file you upload or generate, private to your account." />;
export const ImagesWorkspace = () => <Soon title="Libraix Images" tagline="Generate and edit images from a prompt, saved to your Library." />;
export const CodeWorkspace = () => <Soon title="Libraix Code" tagline="AI coding projects with clear diffs, tests and an isolated sandbox." />;
