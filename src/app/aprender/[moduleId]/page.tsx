"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCourseById } from "@/data/courses";
import { useState, Suspense } from "react";

function LessonContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const moduleId = params.moduleId as string;
  const lessonId = searchParams.get("aula");

  const course = getCourseById(moduleId);
  const [selectedLesson, setSelectedLesson] = useState(
    lessonId || course?.lessons[0]?.id || ""
  );
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!course) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="card text-center">
          <p className="text-lg mb-4">Modulo nao encontrado</p>
          <Link href="/aprender" className="btn-primary">
            Voltar para trilhas
          </Link>
        </div>
      </div>
    );
  }

  const lesson = course.lessons.find((l) => l.id === selectedLesson) || course.lessons[0];
  const lessonIndex = course.lessons.findIndex((l) => l.id === lesson.id);

  const handleQuizAnswer = (index: number) => {
    setQuizAnswer(index);
    setShowExplanation(true);
  };

  const goToNextLesson = () => {
    if (lessonIndex < course.lessons.length - 1) {
      setSelectedLesson(course.lessons[lessonIndex + 1].id);
      setQuizAnswer(null);
      setShowExplanation(false);
      window.scrollTo(0, 0);
    }
  };

  const goToPrevLesson = () => {
    if (lessonIndex > 0) {
      setSelectedLesson(course.lessons[lessonIndex - 1].id);
      setQuizAnswer(null);
      setShowExplanation(false);
      window.scrollTo(0, 0);
    }
  };

  const renderMarkdown = (content: string) => {
    const lines = content.split("\n");
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${tableKey++}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {tableRows[0].map((cell, i) => (
                    <th key={i} className="text-left p-2 border-b font-semibold"
                      style={{ borderColor: "var(--navy-border)" }}>
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="p-2 border-b" style={{ borderColor: "var(--navy-border)" }}>
                        {cell}
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
      inTable = false;
    };

    lines.forEach((line, i) => {
      if (line.startsWith("|")) {
        inTable = true;
        const cells = line.split("|").filter(Boolean).map((c) => c.trim());
        tableRows.push(cells);
        return;
      }

      if (inTable) {
        flushTable();
      }

      if (line.startsWith("# ")) {
        elements.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h1>);
      } else if (line.startsWith("## ")) {
        elements.push(<h2 key={i} className="text-xl font-bold mt-6 mb-2" style={{ color: "var(--emerald)" }}>{line.slice(3)}</h2>);
      } else if (line.startsWith("### ")) {
        elements.push(<h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>);
      } else if (line.startsWith("**") && line.endsWith("**")) {
        elements.push(<p key={i} className="font-bold mt-3 mb-1">{line.slice(2, -2)}</p>);
      } else if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
        if (match) {
          elements.push(
            <div key={i} className="flex gap-2 ml-4 my-1">
              <span style={{ color: "var(--emerald)" }}>•</span>
              <p className="text-sm"><strong>{match[1]}</strong>{match[2]}</p>
            </div>
          );
        }
      } else if (line.startsWith("- ")) {
        elements.push(
          <div key={i} className="flex gap-2 ml-4 my-1">
            <span style={{ color: "var(--emerald)" }}>•</span>
            <p className="text-sm">{line.slice(2)}</p>
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(<p key={i} className="text-sm opacity-80 leading-relaxed">{line}</p>);
      }
    });

    if (inTable) flushTable();
    return elements;
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/aprender" className="opacity-50 hover:opacity-100 transition-opacity">
          Aprender
        </Link>
        <span className="opacity-30">/</span>
        <span style={{ color: "var(--emerald)" }}>{course.title}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="md:w-64 flex-shrink-0">
          <div className="card sticky top-4">
            <h3 className="font-bold mb-3 text-sm">{course.icon} {course.title}</h3>
            <div className="space-y-1">
              {course.lessons.map((l, idx) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setSelectedLesson(l.id);
                    setQuizAnswer(null);
                    setShowExplanation(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                    l.id === lesson.id ? "text-white font-medium" : "opacity-60 hover:opacity-100"
                  }`}
                  style={l.id === lesson.id ? { background: "var(--emerald)" } : {}}
                >
                  <span className="text-xs opacity-60">{idx + 1}.</span>
                  {l.title}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <article className="flex-1 min-w-0">
          <div className="card">
            <div className="flex items-center gap-2 mb-4 text-xs opacity-50">
              <span>⏱ {lesson.duration}</span>
              <span>•</span>
              <span>Aula {lessonIndex + 1} de {course.lessons.length}</span>
            </div>

            <div className="prose-sm">{renderMarkdown(lesson.content)}</div>

            {lesson.quiz && (
              <div className="mt-8 p-6 rounded-xl" style={{ background: "var(--navy-border)" }}>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span>🧠</span> Teste seu conhecimento
                </h3>
                <p className="text-sm mb-4 font-medium">{lesson.quiz.question}</p>
                <div className="space-y-2">
                  {lesson.quiz.options.map((option, idx) => {
                    const isSelected = quizAnswer === idx;
                    const isCorrect = idx === lesson.quiz!.correctIndex;
                    let bgColor = "var(--navy-card)";
                    let borderColor = "var(--navy-border)";
                    if (showExplanation && isCorrect) {
                      bgColor = "rgba(16, 185, 129, 0.15)";
                      borderColor = "var(--emerald)";
                    } else if (showExplanation && isSelected && !isCorrect) {
                      bgColor = "rgba(239, 68, 68, 0.15)";
                      borderColor = "var(--red)";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(idx)}
                        disabled={showExplanation}
                        className="w-full text-left p-3 rounded-xl border text-sm transition-all"
                        style={{ background: bgColor, borderColor }}
                      >
                        <span className="opacity-50 mr-2">{String.fromCharCode(65 + idx)})</span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {showExplanation && (
                  <div className="mt-4 p-4 rounded-xl" style={{
                    background: quizAnswer === lesson.quiz.correctIndex
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                  }}>
                    <p className="text-sm font-bold mb-1">
                      {quizAnswer === lesson.quiz.correctIndex ? "✅ Correto!" : "❌ Nao foi dessa vez"}
                    </p>
                    <p className="text-sm opacity-80">{lesson.quiz.explanation}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between mt-8 pt-4 border-t" style={{ borderColor: "var(--navy-border)" }}>
              <button
                onClick={goToPrevLesson}
                disabled={lessonIndex === 0}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-20 transition-all"
                style={{ background: "var(--navy-border)" }}
              >
                ← Anterior
              </button>
              {lessonIndex < course.lessons.length - 1 ? (
                <button onClick={goToNextLesson} className="btn-primary text-sm">
                  Proxima aula →
                </button>
              ) : (
                <Link href="/aprender" className="btn-primary text-sm">
                  Concluir modulo ✓
                </Link>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function ModulePage() {
  return (
    <Suspense fallback={<div className="p-8">Carregando...</div>}>
      <LessonContent />
    </Suspense>
  );
}
