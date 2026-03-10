import { FormEvent, useEffect, useState } from "react";

type Role = "ADMIN" | "STUDENT";

type AuthState = {
  token: string;
  role: Role;
  studentId?: string;
  email: string;
};

type Subject = {
  id: string;
  name: string;
};

type GradeRecord = {
  id: string;
  value: string;
  subject: Subject;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  grades?: GradeRecord[];
};

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function App() {
  const [email, setEmail] = useState("admin@school.test");
  const [password, setPassword] = useState("Admin123!");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [gradeForm, setGradeForm] = useState({
    studentId: "",
    subjectId: "",
    value: "A"
  });

  async function apiFetch(path: string, options?: RequestInit) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...(options?.headers ?? {})
      }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(body.error ?? "Request failed");
    }

    return response.json();
  }

  useEffect(() => {
    if (!auth) {
      return;
    }

    if (auth.role === "ADMIN") {
      void Promise.all([apiFetch("/api/students"), apiFetch("/api/subjects")])
        .then(([studentData, subjectData]) => {
          setStudents(studentData);
          setSubjects(subjectData);
          setGradeForm((current) => ({
            studentId: current.studentId || studentData[0]?.id || "",
            subjectId: current.subjectId || subjectData[0]?.id || "",
            value: current.value
          }));
        })
        .catch((requestError: Error) => setError(requestError.message));
      return;
    }

    if (auth.studentId) {
      void apiFetch(`/api/students/${auth.studentId}/grades`)
        .then((studentData) => setGrades(studentData.grades))
        .catch((requestError: Error) => setError(requestError.message));
    }
  }, [auth]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Login failed");
      }

      setAuth({
        token: data.token,
        role: data.user.role,
        studentId: data.user.studentId,
        email: data.user.email
      });
      setError("");
    } catch (loginError) {
      setAuth(null);
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    }
  }

  async function handleGradeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await apiFetch("/api/grades", {
        method: "POST",
        body: JSON.stringify(gradeForm)
      });

      const studentData = await apiFetch("/api/students");
      setStudents(studentData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to save grade");
    }
  }

  function switchToStudentDemo() {
    setEmail("student@school.test");
    setPassword("Student123!");
  }

  function logout() {
    setAuth(null);
    setStudents([]);
    setSubjects([]);
    setGrades([]);
    setError("");
  }

  return (
    <main className="shell">
      <section className="panel hero">
        <p className="eyebrow">School portal</p>
        <h1>Grade Management Application</h1>
        <p className="lede">
          Administrators manage students, subjects, and grades. Students authenticate separately
          and only see their own results.
        </p>
      </section>

      {!auth ? (
        <section className="panel login-panel">
          <form className="login-form" onSubmit={handleLogin}>
            <h2>Sign in</h2>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <div className="actions">
              <button type="submit">Log in</button>
              <button type="button" className="ghost" onClick={switchToStudentDemo}>
                Use student demo
              </button>
            </div>
            {error ? <p className="error">{error}</p> : null}
          </form>
        </section>
      ) : (
        <section className="dashboard">
          <div className="panel toolbar">
            <div>
              <p className="eyebrow">Signed in as</p>
              <h2>{auth.email}</h2>
              <p>{auth.role === "ADMIN" ? "Administrator access" : "Student access"}</p>
            </div>
            <button onClick={logout}>Log out</button>
          </div>

          {auth.role === "ADMIN" ? (
            <div className="admin-grid">
              <section className="panel">
                <h3>Assign or update grades</h3>
                <form className="grade-form" onSubmit={handleGradeSubmit}>
                  <label>
                    Student
                    <select
                      value={gradeForm.studentId}
                      onChange={(event) =>
                        setGradeForm((current) => ({ ...current, studentId: event.target.value }))
                      }
                    >
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.firstName} {student.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Subject
                    <select
                      value={gradeForm.subjectId}
                      onChange={(event) =>
                        setGradeForm((current) => ({ ...current, subjectId: event.target.value }))
                      }
                    >
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Grade
                    <select
                      value={gradeForm.value}
                      onChange={(event) =>
                        setGradeForm((current) => ({ ...current, value: event.target.value }))
                      }
                    >
                      {["A", "B", "C", "D", "E", "F"].map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Save grade</button>
                </form>
              </section>

              <section className="panel">
                <h3>Students</h3>
                <div className="table">
                  {students.map((student) => (
                    <article key={student.id} className="student-card">
                      <header>
                        <strong>
                          {student.firstName} {student.lastName}
                        </strong>
                        <span>{student.email}</span>
                      </header>
                      <ul>
                        {student.grades?.map((grade) => (
                          <li key={grade.id}>
                            <span>{grade.subject.name}</span>
                            <strong>{grade.value}</strong>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <section className="panel">
              <h3>My grades</h3>
              <div className="table">
                {grades.map((grade) => (
                  <article key={grade.id} className="grade-row">
                    <span>{grade.subject.name}</span>
                    <strong>{grade.value}</strong>
                  </article>
                ))}
              </div>
            </section>
          )}
          {error ? <p className="error">{error}</p> : null}
        </section>
      )}
    </main>
  );
}
