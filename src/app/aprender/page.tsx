"use client";

import Link from "next/link";
import { courses } from "@/data/courses";
import { glossary } from "@/data/glossary";
import { useState } from "react";

export default function AprenderPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showGlossary, setShowGlossary] = useState(false);

  const filteredGlossary = glossary.filter(
    (term) =>
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Aprenda a Investir</h1>
        <p className="opacity-60">
          Trilhas organizadas do zero ao avancado. Cada aula tem exemplos praticos e exercicios.
        </p>
      </header>

      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setShowGlossary(false)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            !showGlossary ? "text-white" : "opacity-60"
          }`}
          style={!showGlossary ? { background: "var(--emerald)" } : {}}
        >
          Trilhas de Aprendizado
        </button>
        <button
          onClick={() => setShowGlossary(true)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            showGlossary ? "text-white" : "opacity-60"
          }`}
          style={showGlossary ? { background: "var(--emerald)" } : {}}
        >
          Glossario
        </button>
      </div>

      {!showGlossary ? (
        <div className="space-y-6">
          {courses.map((course) => (
            <div key={course.id} className="card">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: "var(--navy-border)" }}>
                  {course.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">{course.title}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      course.difficulty === "iniciante"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : course.difficulty === "intermediario"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {course.difficulty}
                    </span>
                  </div>
                  <p className="text-sm opacity-60">{course.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {course.lessons.map((lesson, lessonIdx) => (
                  <Link
                    key={lesson.id}
                    href={`/aprender/${course.id}?aula=${lesson.id}`}
                  >
                    <div className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/5 cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "var(--emerald)", color: "white" }}>
                        {lessonIdx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{lesson.title}</p>
                        <p className="text-xs opacity-40">{lesson.duration}</p>
                      </div>
                      {lesson.quiz && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                          Quiz
                        </span>
                      )}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                        strokeWidth="2" className="opacity-30">
                        <path d="M6 4L10 8L6 12" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar termo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-sm"
              style={{
                background: "var(--navy-card)",
                borderColor: "var(--navy-border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <div className="space-y-3">
            {filteredGlossary.map((term) => (
              <details key={term.term} className="card cursor-pointer group">
                <summary className="font-bold flex items-center justify-between list-none">
                  <span style={{ color: "var(--emerald)" }}>{term.term}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                    strokeWidth="2" className="opacity-30 transition-transform group-open:rotate-90">
                    <path d="M6 4L10 8L6 12" />
                  </svg>
                </summary>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--navy-border)" }}>
                  <p className="text-sm opacity-80">{term.definition}</p>
                  {term.example && (
                    <p className="text-sm mt-2 p-3 rounded-lg" style={{ background: "var(--navy-border)" }}>
                      💡 {term.example}
                    </p>
                  )}
                  {term.relatedTerms && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {term.relatedTerms.map((rt) => (
                        <span key={rt} className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: "var(--navy-border)" }}>
                          {rt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
