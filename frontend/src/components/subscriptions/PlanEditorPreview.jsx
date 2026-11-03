// Unlinked design for the future API. It cannot save, publish or grant access.
export function FeatureToggle({ label, checked = false }) {
  return <label className="flex items-center gap-3 text-sm">
    <input type="checkbox" checked={checked} disabled readOnly />{label}
  </label>;
}

export function UsageLimitInput({ label, value }) {
  return <label className="grid gap-2 text-sm">{label}
    <input type="number" value={value ?? ''} disabled readOnly placeholder="Not published" className="rounded-xl border border-slate-200 p-3" />
  </label>;
}

export default function PlanEditorPreview({ plan }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6" aria-label="Future plan editor preview">
    <h2 className="display text-2xl">{plan.name}: editor preview</h2>
    <p className="mt-3 text-sm text-muted">Plan editing is unavailable until the subscription APIs are delivered. Changes will eventually follow a draft and publish process.</p>
    <fieldset disabled className="mt-6 grid gap-5">
      <legend className="sr-only">Unavailable plan editor controls</legend>
      <label className="grid gap-2 text-sm">Plan name<input value={plan.name} readOnly className="rounded-xl border border-slate-200 p-3" /></label>
      {(plan.features || []).map((feature) => <FeatureToggle key={feature.key} label={feature.label} checked={feature.enabled} />)}
      {(plan.limits || []).map((limit) => <UsageLimitInput key={limit.key} label={limit.label} value={limit.value} />)}
      <div className="flex gap-3"><button type="button" className="rounded-xl border px-4 py-3 opacity-50">Save draft</button><button type="button" className="rounded-xl bg-brand px-4 py-3 text-white opacity-50">Publish version</button></div>
    </fieldset>
  </section>;
}
