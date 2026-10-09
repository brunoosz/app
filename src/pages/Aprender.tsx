import { useState } from "react";
import { Link } from "react-router-dom";
import { courses } from "@/data/courses";
import { glossary } from "@/data/glossary";

export default function Aprender() {
  const [tab, setTab] = useState<"cursos" | "glossario">("cursos");
  const [search, setSearch] = useState("");

  const filteredGlossary = glossary.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Aprender</h1>
        <p className="opacity-60">Domine o mundo dos investimentos passo a passo.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("cursos")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none ${
            tab === "cursos" ? "text-white" : "opacity-60"
          }`}
          style={{
            background: tab === "cursos" ? "var(--emerald)" : "var(--navy-card)",
            color: tab === "cursos" ? "white" : "var(--foreground)",
          }}
        >
          Cursos
        </button>
        <button
          onClick={() => setTab("glossario")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none ${
            tab === "glossario" ? "text-white" : "opacity-60"
          }`}
          style={{
            background: tab === "glossario" ? "var(--emerald)" : "var(--navy-card)",
            color: tab === "glossario" ? "white" : "var(--foreground)",
          }}
        >
          Glossario
        </button>
      </div>

      {tab === "cursos" ? (
        <div className="space-y-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/aprender/${course.id}`}
              className="card flex items-start gap-4 hover:border-emerald-500/30 transition-all no-underline block"
              style={{ color: "var(--foreground)" }}
            >
              <span className="text-4xl">{course.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{course.title}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--navy-border)" }}
                  >
                    {course.difficulty}
                  </span>
                </div>
                <p className="text-sm opacity-60 mb-3">{course.description}</p>
                <div className="flex items-center gap-4 text-xs opacity-40">
                  <span>{course.lessons.length} aulas</span>
                  <span>
                    {course.lessons.reduce(
                      (acc, l) => acc + parseInt(l.duration),
                      0
                    )}{" "}
                    min total
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Buscar termo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
          <div className="space-y-3">
            {filteredGlossary.map((term) => (
              <div key={term.term} className="card">
                <h3 className="font-bold text-lg mb-2" style={{ color: "var(--emerald)" }}>
                  {term.term}
                </h3>
                <p className="text-sm opacity-80 mb-2">{term.definition}</p>
                {term.example && (
                  <p className="text-xs opacity-60 mb-2">
                    <strong>Exemplo:</strong> {term.example}
                  </p>
                )}
                {term.relatedTerms && (
                  <div className="flex flex-wrap gap-1">
                    {term.relatedTerms.map((rt) => (
                      <span
                        key={rt}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--navy-border)" }}
                      >
                        {rt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {filteredGlossary.length === 0 && (
              <p className="text-center opacity-40 py-8">Nenhum termo encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
