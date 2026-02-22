from dataclasses import dataclass, field
from typing import Any


@dataclass
class SubAgentReport:
    agent_name: str
    source_type: str  # gmail, drive, sheets
    metrics: dict[str, Any] = field(default_factory=dict)
    findings: list[str] = field(default_factory=list)
    contradictions: list[dict] = field(default_factory=list)


@dataclass
class PipelineState:
    client_id: str
    current_phase: str = "explore"
    sub_agent_reports: list[SubAgentReport] = field(default_factory=list)
    knowledge_tree_draft: list[dict] = field(default_factory=list)
    open_contradictions: list[dict] = field(default_factory=list)
    messages: list[dict] = field(default_factory=list)

    def add_report(self, report: SubAgentReport):
        self.sub_agent_reports.append(report)

    def get_summary(self) -> str:
        """Summarize current state for LLM context."""
        parts = [f"Client: {self.client_id}", f"Phase: {self.current_phase}"]
        if self.sub_agent_reports:
            parts.append(f"Reports from {len(self.sub_agent_reports)} sub-agents:")
            for r in self.sub_agent_reports:
                parts.append(f"  - {r.agent_name} ({r.source_type}): {r.metrics}")
        if self.open_contradictions:
            parts.append(f"Open contradictions: {len(self.open_contradictions)}")
        return "\n".join(parts)
