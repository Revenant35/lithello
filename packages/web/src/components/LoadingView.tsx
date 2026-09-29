type LoadingViewProps = {
  label?: string;
};

export function LoadingView({ label = 'Loading…' }: LoadingViewProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-svh flex-col items-center justify-center gap-6 bg-wood-950 p-6"
    >
      <div className="[perspective:480px]">
        <div className="relative size-14 animate-[flip-disc_1.6s_ease-in-out_infinite] [transform-style:preserve-3d]">
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_28%,#fff_0%,#e9e8df_55%,#b9b9b2_100%)] shadow-[0_0.18rem_0.35rem_rgba(0,0,0,0.35),inset_0_0.08rem_0.16rem_rgba(255,255,255,0.24)] [backface-visibility:hidden]" />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_28%,#46504b_0%,#171b19_45%,#080a09_100%)] shadow-[0_0.18rem_0.35rem_rgba(0,0,0,0.35),inset_0_0.08rem_0.16rem_rgba(255,255,255,0.24)] [backface-visibility:hidden] [transform:rotateY(180deg)]" />
        </div>
      </div>
      <p className="text-sm text-parchment-500">{label}</p>
    </div>
  );
}
