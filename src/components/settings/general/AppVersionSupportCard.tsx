'use client';

import { BookOpen, Coffee, Container, ExternalLink, Github, Globe } from 'lucide-react';
import packageInfo from '../../../../package.json';
import SettingsCard from '../shared/SettingsCard';

export default function AppVersionSupportCard() {
  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gunmetal-border/70">
        <div className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Application Version
          </h4>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-bold text-slate-100 font-mono">
              OpenFareScraper v{packageInfo.version}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-semibold bg-sky-950/60 text-sky-300 border-sky-800/60">
              REST API v1
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://github.com/thebronway/OpenFareScraper/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Release Notes</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted" />
          </a>
          <a
            href="https://hub.docker.com/r/thebronway/openfarescraper"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 text-slate-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Container className="w-3.5 h-3.5 text-sky-400" />
            <span>Docker Hub</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted" />
          </a>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
          Support &amp; Project Links
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="https://brian.conway.im/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Developer&apos;s Website</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>

          <a
            href="https://github.com/thebronway/OpenFareScraper/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Github className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>Report An Issue</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>

          <a
            href="https://buymeacoffee.com/brianconway"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
          >
            <Coffee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Support OpenFareScraper</span>
            <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
          </a>
        </div>
      </div>
    </SettingsCard>
  );
}