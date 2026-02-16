/**
 * GithubUser - A custom component that displays GitHub user information.
 *
 * This component demonstrates how to create custom pupt-lib components
 * that work with external data sources.
 */

import { Component } from "@pupt/react";
import type { PuptNode } from "@pupt/react";
import { z } from "zod";

export interface GitHubUserData {
  login: string;
  name: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  avatar_url: string;
  html_url: string;
}

interface GithubUserProps {
  /** The fetched GitHub user data */
  user?: GitHubUserData;
  children?: PuptNode;
}

/**
 * GithubUser component - displays fetched GitHub user information.
 *
 * Usage in prompt:
 * ```tsx
 * // __githubUserData is injected by the demo based on Ask.Text input
 * <GithubUser user={__githubUserData} />
 * ```
 */
export class GithubUser extends Component<GithubUserProps> {
  static schema = z
    .object({
      user: z
        .object({
          login: z.string(),
          name: z.string().nullable(),
          company: z.string().nullable(),
          location: z.string().nullable(),
          bio: z.string().nullable(),
          public_repos: z.number(),
          followers: z.number(),
          following: z.number(),
          created_at: z.string(),
          avatar_url: z.string().optional(),
          html_url: z.string().optional(),
        })
        .optional(),
    })
    .passthrough();

  render(props: GithubUserProps): PuptNode {
    const { user } = props;

    if (!user) {
      return "[Loading GitHub user data...]";
    }

    const joinDate = new Date(user.created_at).toLocaleDateString();

    // Return formatted user information
    return `GitHub User: @${user.login}
Name: ${user.name ?? "Not specified"}
Company: ${user.company ?? "Not specified"}
Location: ${user.location ?? "Not specified"}
Bio: ${user.bio ?? "No bio"}
Public Repos: ${user.public_repos}
Followers: ${user.followers}
Following: ${user.following}
Member Since: ${joinDate}`;
  }
}
