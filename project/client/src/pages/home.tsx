import ProblemSolver from "@/components/problem-solver";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Math & Science Problem Solver
          </h1>
          <p className="text-muted-foreground mt-2">
            Get instant solutions to your math and science problems using AI
          </p>
        </div>
        <ProblemSolver />
      </div>
    </div>
  );
}
