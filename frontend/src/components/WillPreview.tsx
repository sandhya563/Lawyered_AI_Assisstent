'use client'

interface WillPreviewProps {
  data: {
    testator: {
      fullName: string
      age: number | string
      address: string
      soundMind: boolean
    }
    executor: { name: string; relationship: string; address?: string } | null
    guardian: { name: string; relationship: string; address?: string } | null
    hasMinorChildren: boolean
    assets: {
      id: string
      description: string
      type: string
      value: string
      allocations: {
        beneficiaryName: string
        sharePercentage: number
        conditions?: string
      }[]
    }[]
    beneficiaries: {
      id: string
      fullName: string
      relationship: string
      dateOfBirth?: string
    }[]
    witnesses: {
      id: string
      fullName: string
      address?: string
      isBeneficiary: boolean
    }[]
    signingDate: string | null
    signingPlace: string | null
    status: string
  }
}

export default function WillPreview({ data }: WillPreviewProps) {
  const { testator, executor, guardian, assets, beneficiaries, witnesses, signingDate, signingPlace } = data

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-xl font-bold text-center text-gray-900 border-b pb-4">
        LAST WILL AND TESTAMENT
      </h2>

      {/* Section 1: Declaration */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          1. Declaration
        </h3>
        <p className="text-sm text-gray-700">
          I, <strong>{testator.fullName || '________'}</strong>, aged{' '}
          <strong>{testator.age || '__'}</strong> years, residing at{' '}
          <strong>{testator.address || '________________'}</strong>, being of sound mind and
          disposing memory, do hereby declare this to be my Last Will and Testament.
        </p>
      </section>

      {/* Section 2: Revocation */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          2. Revocation
        </h3>
        <p className="text-sm text-gray-700">
          I hereby revoke all previous Wills, Codicils, and Testamentary Dispositions made by me.
        </p>
      </section>

      {/* Section 3: Assets & Distribution */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          3. Distribution of Assets
        </h3>
        {assets.length > 0 ? (
          <div className="space-y-3">
            {assets.map((asset, idx) => (
              <div key={asset.id} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">
                  {idx + 1}. {asset.description}
                  {asset.value && (
                    <span className="text-gray-500 font-normal"> — ₹{asset.value}</span>
                  )}
                </p>
                {asset.allocations.length > 0 && (
                  <div className="mt-1 ml-4 space-y-1">
                    {asset.allocations.map((alloc, i) => (
                      <p key={i} className="text-xs text-gray-600">
                        → {alloc.sharePercentage}% to {alloc.beneficiaryName}
                        {alloc.conditions && <em> ({alloc.conditions})</em>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No assets added yet</p>
        )}
      </section>

      {/* Section 4: Beneficiaries */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          4. Beneficiaries
        </h3>
        {beneficiaries.length > 0 ? (
          <div className="space-y-1">
            {beneficiaries.map((ben) => (
              <p key={ben.id} className="text-sm text-gray-700">
                • <strong>{ben.fullName}</strong> ({ben.relationship})
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No beneficiaries added yet</p>
        )}
      </section>

      {/* Section 5: Executor */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          5. Executor
        </h3>
        {executor ? (
          <p className="text-sm text-gray-700">
            <strong>{executor.name}</strong>
            {executor.relationship && ` (${executor.relationship})`}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">No executor named yet</p>
        )}
      </section>

      {/* Section 6: Guardian (if applicable) */}
      {data.hasMinorChildren && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            6. Guardian for Minor Children
          </h3>
          {guardian ? (
            <p className="text-sm text-gray-700">
              <strong>{guardian.name}</strong>
              {guardian.relationship && ` (${guardian.relationship})`}
            </p>
          ) : (
            <p className="text-sm text-red-400 italic">⚠ Guardian required for minor children</p>
          )}
        </section>
      )}

      {/* Section 7: Witnesses */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {data.hasMinorChildren ? '7' : '6'}. Witnesses
        </h3>
        {witnesses.length > 0 ? (
          <div className="space-y-1">
            {witnesses.map((witness) => (
              <p key={witness.id} className="text-sm text-gray-700">
                • <strong>{witness.fullName}</strong>
                {witness.address && ` — ${witness.address}`}
                {witness.isBeneficiary && (
                  <span className="text-yellow-600 text-xs ml-2">(⚠ also a beneficiary)</span>
                )}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No witnesses added yet</p>
        )}
      </section>

      {/* Section 8: Signature */}
      <section className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Signature
        </h3>
        <p className="text-sm text-gray-700">
          Date: {signingDate ? new Date(signingDate).toLocaleDateString() : '________'}
        </p>
        <p className="text-sm text-gray-700">
          Place: {signingPlace || '________'}
        </p>
        <div className="mt-4 border-t border-dashed pt-2">
          <p className="text-xs text-gray-500">___________________________</p>
          <p className="text-xs text-gray-500">{testator.fullName || 'Testator'} (Signature)</p>
        </div>
      </section>
    </div>
  )
}
