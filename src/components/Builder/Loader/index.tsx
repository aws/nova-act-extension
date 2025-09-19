import './index.css';

type Alignment = 'left' | 'right' | 'center';

export const Loader = ({ alignment }: { alignment?: Alignment }) => {
  return (
    <div style={{ justifyContent: alignment ?? 'center' }} className="loader-container">
      <div className="loader" />
    </div>
  );
};
