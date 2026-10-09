import { useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getCourseById } from "@/data/courses";

export default function Modulo() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonIndex = parseInt(searchParams.get("aula") || "0");

  const course = getCourseById(moduleId || "");

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  if (!course) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Modulo nao encontrado</h1>
        <Link to="/aprender" className="btn-primary inline-block no-underline">
          Voltar para cursos
        </Link>
      </div>
    );
  }

  const lesson = course.lessons[lessonIndex] || course.lessons[0];
  const currentIndex = course.lessons.indexOf(lesson);

  function goToLesson(index: number) {
    setSelectedAnswer(null);
    setShowResult(false);
    setSearchParams({ aula: index.toString() });
  }

  function renderMarkdown(content: string) {
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    function flushTable() {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {tableRows[0].map((cell, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 border-b font-semibold"
                      style={{ borderColor: "var(--navy-border)" }}
                    >
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-3 py-2 border-b opacity-80"
                        style={{ borderColor: "var(--navy-border)" }}
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("|")) {
        inTable = true;
        tableRows.push(
          line
            .split("|")
            .filter((c) => c.trim() !== "")
        );
        continue;
      } else if (inTable) {
        inTable = false;
        flushTable();
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className="text-lg font-bold mt-6 mb-2">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="text-xl font-bold mt-8 mb-3" style={{ color: "var(--emerald)" }}>
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="text-2xl font-bold mb-4">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*\s*[-–]?\s*(.*)/);
        if (match) {
          elements.push(
            <div key={i} className="flex gap-2 ml-4 mb-2">
              <span style={{ color: "var(--emerald)" }}>&#8226;</span>
              <p className="text-sm opacity-80">
                <strong>{match[1]}</strong>
                {match[2] ? ` - ${match[2]}` : ""}
              </p>
            </div>
          );
        }
      } else if (line.startsWith("- ")) {
        elements.push(
          <div key={i} className="flex gap-2 ml-4 mb-2">
            <span style={{ color: "var(--emerald)" }}>&#8226;</span>
            <p className="text-sm opacity-80">{line.slice(2)}</p>
          </div>
        );
      } else if (line.match(/^\d+\.\s/)) {
        const match = line.match(/^(\d+)\.\s(.+)/);
        if (match) {
          elements.push(
            <div key={i} className="flex gap-2 ml-4 mb-2">
              <span className="font-bold text-sm" style={{ color: "var(--emerald)" }}>
                {match[1]}.
              </span>
              <p className="text-sm opacity-80">{match[2]}</p>
            </div>
          );
        }
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-2" />);
      } else {
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>");
        elements.push(
          <p
            key={i}
            className="text-sm opacity-80 leading-relaxed mb-2"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      }
    }

    if (inTable) flushTable();

    return elements;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        to="/aprender"
        className="text-sm opacity-50 hover:opacity-100 transition-all no-underline mb-6 inline-block"
        style={{ color: "var(--foreground)" }}
      >
        &larr; Voltar para cursos
      </Link>

      <div className="flex gap-6 flex-col md:flex-row">
        <div className="md:w-64 shrink-0">
          <div className="card sticky top-6">
            <h2 className="font-bold mb-3 text-sm">{course.icon} {course.title}</h2>
            <div className="space-y-1">
              {course.lessons.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => goToLesson(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer border-none ${
                    idx === currentIndex ? "font-bold" : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    background: idx === currentIndex ? "var(--emerald)" : "transparent",
                    color: idx === currentIndex ? "white" : "var(--foreground)",
                  }}
                >
                  {idx + 1}. {l.title}
                  <span className="block opacity-50 mt-0.5">{l.duration}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="card">{renderMarkdown(lesson.content)}</div>

          {lesson.quiz && (
            <div className="card mt-4">
              <h3 className="font-bold mb-4" style={{ color: "var(--emerald)" }}>
                Quiz
              </h3>
              <p className="text-sm font-medium mb-4">{lesson.quiz.question}</p>
              <div className="space-y-2">
                {lesson.quiz.options.map((option, idx) => {
                  let bg = "var(--navy-border)";
                  if (showResult) {
                    if (idx === lesson.quiz!.correctIndex) bg = "var(--emerald)";
                    else if (idx === selectedAnswer) bg = "var(--red)";
                  } else if (idx === selectedAnswer) {
                    bg = "var(--emerald-dark)";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!showResult) setSelectedAnswer(idx);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all cursor-pointer border-none"
                      style={{ background: bg, color: "var(--foreground)" }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {selectedAnswer !== null && !showResult && (
                <button
                  onClick={() => setShowResult(true)}
                  className="btn-primary mt-4 w-full"
                >
                  Verificar resposta
                </button>
              )}
              {showResult && (
                <div
                  className="mt-4 p-4 rounded-xl text-sm"
                  style={{
                    background:
                      selectedAnswer === lesson.quiz.correctIndex
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(239,68,68,0.15)",
                  }}
                >
                  <p className="font-bold mb-1">
                    {selectedAnswer === lesson.quiz.correctIndex
                      ? "Correto!"
                      : "Incorreto!"}
                  </p>
                  <p className="opacity-80">{lesson.quiz.explanation}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button
              onClick={() => goToLesson(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="btn-primary text-sm"
            >
              &larr; Anterior
            </button>
            <button
              onClick={() => goToLesson(currentIndex + 1)}
              disabled={currentIndex === course.lessons.length - 1}
              className="btn-primary text-sm"
            >
              Proxima &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
