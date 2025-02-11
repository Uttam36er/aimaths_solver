import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  math: string;
  block?: boolean;
}

export default function MathRenderer({ math, block = false }: MathRendererProps) {
  try {
    return block ? (
      <BlockMath math={math} />
    ) : (
      <InlineMath math={math} />
    );
  } catch (error) {
    console.error('Math rendering error:', error);
    return <span className="text-destructive">{math}</span>;
  }
}
