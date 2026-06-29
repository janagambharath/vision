export function SectionHeading({
  kicker,
  title,
  children,
  inverse = false
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
  inverse?: boolean;
}) {
  return (
    <div className="mb-10 max-w-3xl">
      <p className={inverse ? "vv-kicker text-cyan-300" : "vv-kicker"}>{kicker}</p>
      <h2 className={inverse ? "text-3xl font-extrabold leading-tight text-white md:text-4xl" : "text-3xl font-extrabold leading-tight text-slate-950 md:text-4xl"}>
        {title}
      </h2>
      {children ? <div className={inverse ? "mt-4 text-slate-300" : "mt-4 text-slate-600"}>{children}</div> : null}
    </div>
  );
}
