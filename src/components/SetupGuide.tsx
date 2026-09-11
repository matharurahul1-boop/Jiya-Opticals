import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Step {
  title: string;
  where?: string;
  body: string[];
}

interface Section {
  heading: string;
  intro?: string;
  where?: string;
  steps: Step[];
}

const SECTIONS: Section[] = [
  {
    heading: '1. One-time technical setup (do this first, before the client touches anything)',
    intro: 'You need a Supabase project already created for the client, with its Project URL and Publishable key, and the app deployed (e.g. on Vercel) with those two values set as environment variables.',
    steps: [
      {
        title: 'Run the database setup script',
        where: 'Supabase dashboard → SQL Editor → New query',
        body: [
          'Open supabase/LIVE_SETUP.sql from the project and copy the entire file.',
          'Paste it into the SQL Editor and click Run. It is safe to run more than once.',
          'You should see "Success. No rows returned." If you see a red error, copy the exact message and fix that before continuing — nothing else will work until this succeeds.'
        ]
      },
      {
        title: 'Set the environment variables on the hosting side',
        where: 'Vercel (or wherever the app is hosted) → Project → Settings → Environment Variables',
        body: [
          'VITE_SUPABASE_URL = the Project URL from Supabase → Settings → API.',
          'VITE_SUPABASE_PUBLISHABLE_KEY = the "publishable" (or legacy "anon public") key from the same page. Never use the "secret"/"service_role" key here.',
          'Apply the variables to Production (and Preview if you test there too), then trigger a fresh deploy — changing env vars does not update an already-built deployment.'
        ]
      },
      {
        title: 'Open the live site once to confirm it connects',
        body: [
          'Visit the deployed URL. You should see the Jiya Opticals sign-in screen, not a red configuration error and not the amber "Local demo mode" banner.',
          'If you see an error here, read it fully — it now tells you exactly what is wrong (missing key, wrong project, SQL not run, etc.) instead of a generic failure.'
        ]
      }
    ]
  },
  {
    heading: '2. Create the client\'s account (do this together with the client, or hand them these 3 steps)',
    steps: [
      {
        title: 'Sign up',
        body: [
          'On the sign-in screen, tap "New here? Create an account".',
          'Use the client\'s real business email and a password they will remember.',
          'Confirm the email via the link Supabase sends, then come back and sign in.'
        ]
      },
      {
        title: 'Create the store (first person only)',
        body: [
          'The very first person to sign in sees "First-time setup". Enter the business name and tap "Create the store".',
          'This person becomes the Admin / business owner — they can do everything. Only ever do this once per client; a second store cannot be created after the first.'
        ]
      }
    ]
  },
  {
    heading: '3. Fill in the business basics',
    intro: 'All of this is under the sidebar: Masters & Settings.',
    steps: [
      {
        title: 'Store Profile & GSTIN tab',
        body: [
          'Store name, tagline, phone, email, GSTIN, PAN, address.',
          'Bank details and UPI ID — this is what customers pay to.',
          'Upload the UPI QR image (the one from PhonePe/GPay/the bank) under "Upload QR image" — it saves the instant you upload it, no extra Save click needed. If you skip this, the app auto-generates a QR from the UPI ID instead.',
          'GST % per category, if it differs from the defaults.',
          'Tap the big Save button at the bottom of the tab when you finish the other fields.'
        ]
      },
      {
        title: 'Shop Branches tab',
        body: [
          'Add one entry per physical shop — name, code, address, city, phone, GSTIN (if the branch has its own).',
          'Mark the main branch as "Primary" if the client has more than one shop.'
        ]
      },
      {
        title: 'Doctors & Optometrists tab',
        body: [
          'Add every doctor/optometrist who will be attached to eye-test prescriptions and billing.'
        ]
      }
    ]
  },
  {
    heading: '4. Add the client\'s staff',
    where: 'Sidebar → Team & Access',
    steps: [
      {
        title: 'Give the app link to each staff member',
        body: [
          'Ask them to sign up with their own email (step 2, "Sign up" — they should NOT create a new store, just sign up and wait).',
          'They will land on a "Join your shop team" screen and request the shop they work at.'
        ]
      },
      {
        title: 'Approve the request',
        body: [
          'As Admin, open Team & Access — pending requests show at the top with Approve / Reject.',
          'After approving, you can change anyone\'s role (Shop Manager, Optometrist, Cashier, Lab Technician) or which shops they can see, any time, using the dropdown and "Edit shops" next to their name.'
        ]
      }
    ]
  },
  {
    heading: '5. Load the client\'s products',
    where: 'Sidebar → Inventory',
    steps: [
      {
        title: 'Create Material',
        body: [
          'Each product is created once (name, brand, price, GST) and is shared across every shop automatically.',
          'Pick the shop that receives the opening stock quantity. Other shops start at 0 until you transfer stock to them or record a purchase there.',
          'For a large catalogue, use "Import CSV" instead of adding items one by one — download the sample template first to see the expected columns.'
        ]
      }
    ]
  },
  {
    heading: '6. Test before you leave the client\'s shop',
    steps: [
      {
        title: 'Do one real test bill',
        body: [
          'Go to POS Billing, add a product, pick or create a client, and save a bill — confirm GST and totals look right and the invoice prints correctly.',
          'Check Day Book shows that bill.',
          'If the client has more than one shop, sign in as a staff account and confirm they only see the shop(s) they were assigned.'
        ]
      },
      {
        title: 'Hand over',
        body: [
          'Give the client the Admin login and remind them not to share it with staff — staff should each sign up with their own email instead.',
          'Point them to this Setup Guide tab (Masters & Settings → Setup Guide) if they ever add a new shop or staff member themselves.'
        ]
      }
    ]
  }
];

export function SetupGuide({ isCloud }: { isCloud: boolean }) {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-amber-200/80 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900">New client setup — step by step</h2>
        <p className="text-sm text-stone-600 mt-1">
          Follow these in order the first time you set up a new client. Nothing here is destructive — it is safe to revisit any step later.
        </p>
        {!isCloud && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            You are currently in local demo mode (no Supabase connected). Section 1 below only applies once this deployment is connected to the client's own Supabase project.
          </p>
        )}
      </div>

      {SECTIONS.map((section) => (
        <div key={section.heading} className="bg-white border border-stone-200 rounded-xl p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="font-bold text-stone-900">{section.heading}</h3>
            {section.where && <p className="text-[11px] text-stone-500 mt-0.5">📍 {section.where}</p>}
            {section.intro && <p className="text-xs text-stone-500 mt-1">{section.intro}</p>}
          </div>
          <ol className="space-y-3">
            {section.steps.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 text-sm">{step.title}</p>
                  {step.where && <p className="text-[11px] text-stone-500 mt-0.5">📍 {step.where}</p>}
                  <ul className="mt-1.5 space-y-1">
                    {step.body.map((line) => (
                      <li key={line} className="flex gap-2 text-xs text-stone-600 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
