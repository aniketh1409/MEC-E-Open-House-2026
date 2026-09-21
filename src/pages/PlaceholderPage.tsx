interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Content is being prepared for the 2026 Open House.</p>
    </section>
  );
}
