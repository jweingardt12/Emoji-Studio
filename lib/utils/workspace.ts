/**
 * Workspace display name utilities
 *
 * The app stores two workspace-related values:
 * - `workspace`: The raw Slack workspace identifier (e.g., "my-company" or "T0ABC123")
 * - `workspaceDisplayName`: User's custom display name (optional)
 */

/**
 * Format a raw workspace name to title case
 * "my-company" -> "My Company"
 * "slack_workspace" -> "Slack Workspace"
 */
export function formatWorkspaceName(workspace: string): string {
  if (!workspace) return "Workspace"
  return workspace
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Get the display name for the workspace
 * Priority: custom display name > formatted raw workspace > default
 */
export function getWorkspaceDisplayName(
  workspaceDisplayName: string | null | undefined,
  workspace: string | null | undefined
): string {
  // If there's a custom display name, use it exactly as entered
  if (workspaceDisplayName && workspaceDisplayName.trim()) {
    return workspaceDisplayName.trim()
  }

  // Fall back to formatting the raw workspace name
  if (workspace) {
    return formatWorkspaceName(workspace)
  }

  return "Workspace"
}
