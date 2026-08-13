import { getSession } from '@/lib/guards';

export default async function EducationHome() {
  const session = await getSession();
  const name = session?.user.name ?? 'Learner';

  return (
    <>
      <section className="edu-hero">
        <h1>Welcome, {name}</h1>
        <p>
          This is your education dashboard. Registration, credentials and
          consent settings appear here as you move through the journey.
        </p>
      </section>
      <div className="edu-card">
        <h2>Next step</h2>
        <p>
          Start your learner registration. Your wallet has already confirmed
          your identity, so the form is prefilled with verified attributes.
        </p>
      </div>
    </>
  );
}
