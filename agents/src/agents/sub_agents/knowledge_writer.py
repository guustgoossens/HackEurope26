import logging
import json

from ..llm.adapters import AnthropicAdapter
from ..tools.definitions import KNOWLEDGE_WRITER_TOOLS, get_tool_schema, ToolCall
from ..tools.executor import ToolExecutor
from ..storage.convex_client import ConvexClient

logger = logging.getLogger(__name__)


class KnowledgeWriterAgent:
    """Writes verified knowledge entries to the knowledge base."""

    def __init__(
        self,
        llm: AnthropicAdapter,
        executor: ToolExecutor,
        convex: ConvexClient,
        client_id: str,
        tree_nodes: list[dict],
        accumulated_knowledge: str = "",
    ):
        self.llm = llm
        self.executor = executor
        self.convex = convex
        self.client_id = client_id
        self.tree_nodes = tree_nodes
        self.accumulated_knowledge = accumulated_knowledge
        self.max_turns = 25
        self.entries_written = 0

    async def run(self) -> dict:
        await self.convex.emit_event(
            self.client_id,
            "knowledge-writer",
            "info",
            f"Starting knowledge writer with {len(self.tree_nodes)} tree nodes",
        )

        nodes_summary = json.dumps(self.tree_nodes, indent=2, default=str)

        system = (
            "You are a knowledge writer agent responsible for populating a knowledge base.\n"
            "You have verified tree nodes and accumulated knowledge from previous pipeline phases.\n"
            "Your tools:\n"
            "- write_knowledge_entry: Write a knowledge entry to a specific tree node\n"
            "- flag_contradiction: Flag contradictions found during writing\n\n"
            "For each tree node, generate appropriate knowledge entries based on the accumulated data.\n"
            "Each entry should have:\n"
            "- tree_node_id: The ID of the tree node to attach to\n"
            "- title: A clear, descriptive title\n"
            "- content: Detailed, structured content\n"
            "- source_ref: Reference to the original data source (if known)\n"
            "- confidence: A score from 0 to 1 indicating confidence in the information\n\n"
            "Write entries that are factual, well-structured, and useful for business decision-making.\n"
            "If you encounter contradictory information, flag it with flag_contradiction.\n"
            "Process all tree nodes systematically."
        )

        messages = [
            {
                "role": "user",
                "content": (
                    f"Write knowledge entries for the following tree nodes. Use the accumulated knowledge "
                    f"from the explore and structure phases to generate entries.\n\n"
                    f"Tree nodes:\n{nodes_summary}\n\n"
                    f"Accumulated knowledge:\n{self.accumulated_knowledge}"
                ),
            }
        ]
        tools = [get_tool_schema(t) for t in KNOWLEDGE_WRITER_TOOLS]

        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.llm.complete_with_tools_messages(
                messages, tools, system
            )

            if not tool_calls_raw:
                # No more tool calls -- agent is done
                break

            # Build assistant content block
            assistant_content = []
            if text:
                assistant_content.append({"type": "text", "text": text})
            for tc in tool_calls_raw:
                assistant_content.append(
                    {
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["input"],
                    }
                )
            messages.append({"role": "assistant", "content": assistant_content})

            # Execute each tool call
            tool_results = []
            for tc in tool_calls_raw:
                call = ToolCall(id=tc["id"], name=tc["name"], input=tc["input"])

                if call.name == "write_knowledge_entry":
                    self.entries_written += 1
                    await self.convex.emit_event(
                        self.client_id,
                        "knowledge-writer",
                        "progress",
                        f"Writing entry #{self.entries_written}: {call.input.get('title', 'untitled')}",
                    )

                result = await self.executor.execute(call)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": result.content,
                        "is_error": result.is_error,
                    }
                )

            messages.append({"role": "user", "content": tool_results})

        await self.convex.emit_event(
            self.client_id,
            "knowledge-writer",
            "complete",
            f"Knowledge writing complete: {self.entries_written} entries written",
        )

        return {
            "entries_written": self.entries_written,
            "tree_nodes_processed": len(self.tree_nodes),
        }
