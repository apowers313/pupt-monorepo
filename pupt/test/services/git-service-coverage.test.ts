import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitService } from '../../src/services/git-service';
import simpleGit from 'simple-git';

vi.mock('simple-git');

describe('GitService - additional coverage', () => {
  let service: GitService;
  let mockGit: any;

  beforeEach(() => {
    mockGit = {
      checkIsRepo: vi.fn(),
      clone: vi.fn(),
      pull: vi.fn(),
      status: vi.fn(),
      log: vi.fn(),
      branch: vi.fn(),
      checkout: vi.fn(),
      remote: vi.fn(),
      revparse: vi.fn()
    };

    vi.mocked(simpleGit).mockReturnValue(mockGit as any);
    service = new GitService();
  });

  describe('getRecentCommits', () => {
    it('should return log result with default limit', async () => {
      const mockLogResult = {
        all: [
          { hash: 'abc123', message: 'commit 1' },
          { hash: 'def456', message: 'commit 2' }
        ],
        latest: { hash: 'abc123', message: 'commit 1' },
        total: 2
      };
      mockGit.log.mockResolvedValue(mockLogResult);

      const result = await service.getRecentCommits();

      expect(result).toEqual(mockLogResult);
      expect(mockGit.log).toHaveBeenCalledWith(['-n', '10']);
    });

    it('should return log result with custom limit', async () => {
      const mockLogResult = {
        all: [{ hash: 'abc123', message: 'commit 1' }],
        latest: { hash: 'abc123', message: 'commit 1' },
        total: 1
      };
      mockGit.log.mockResolvedValue(mockLogResult);

      const result = await service.getRecentCommits(5);

      expect(result).toEqual(mockLogResult);
      expect(mockGit.log).toHaveBeenCalledWith(['-n', '5']);
    });

    it('should return null on error', async () => {
      mockGit.log.mockRejectedValue(new Error('Not a git repo'));

      const result = await service.getRecentCommits();

      expect(result).toBeNull();
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return true when there are uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => false,
        modified: ['file.txt']
      });

      const result = await service.hasUncommittedChanges();

      expect(result).toBe(true);
    });

    it('should return false when working directory is clean', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        modified: []
      });

      const result = await service.hasUncommittedChanges();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockGit.status.mockRejectedValue(new Error('Not a git repo'));

      const result = await service.hasUncommittedChanges();

      expect(result).toBe(false);
    });
  });

  describe('getRepositoryRoot', () => {
    it('should return trimmed repository root path', async () => {
      mockGit.revparse.mockResolvedValue('/home/user/project\n');

      const result = await service.getRepositoryRoot();

      expect(result).toBe('/home/user/project');
      expect(mockGit.revparse).toHaveBeenCalledWith(['--show-toplevel']);
    });

    it('should return root without trailing whitespace', async () => {
      mockGit.revparse.mockResolvedValue('  /home/user/project  ');

      const result = await service.getRepositoryRoot();

      expect(result).toBe('/home/user/project');
    });

    it('should return null on error', async () => {
      mockGit.revparse.mockRejectedValue(new Error('Not a git repo'));

      const result = await service.getRepositoryRoot();

      expect(result).toBeNull();
    });
  });

  describe('setWorkingDirectory', () => {
    it('should reinitialize git with new working directory', () => {
      const newMockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(simpleGit).mockReturnValueOnce(mockGit as any).mockReturnValueOnce(newMockGit as any);

      service.setWorkingDirectory('/new/path');

      expect(simpleGit).toHaveBeenCalledWith('/new/path');
    });

    it('should use the new git instance for subsequent calls', async () => {
      const newMockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true),
        log: vi.fn().mockResolvedValue({ all: [], total: 0 }),
        status: vi.fn(),
        branch: vi.fn(),
        remote: vi.fn(),
        revparse: vi.fn()
      };
      vi.mocked(simpleGit).mockReturnValue(newMockGit as any);

      service.setWorkingDirectory('/another/path');

      // Now calls should go to the new mock
      await service.getRecentCommits();
      expect(newMockGit.log).toHaveBeenCalledWith(['-n', '10']);
    });
  });

  describe('isRepository with custom path', () => {
    it('should create a new simpleGit instance when path is provided', async () => {
      const pathMockGit = {
        checkIsRepo: vi.fn().mockResolvedValue(true)
      };
      // First call in constructor, second call in isRepository with path
      vi.mocked(simpleGit)
        .mockReturnValueOnce(mockGit as any)
        .mockReturnValueOnce(pathMockGit as any);

      service = new GitService();
      const result = await service.isRepository('/custom/path');

      expect(result).toBe(true);
      expect(simpleGit).toHaveBeenCalledWith('/custom/path');
      expect(pathMockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should return false when custom path check fails', async () => {
      const pathMockGit = {
        checkIsRepo: vi.fn().mockRejectedValue(new Error('Not a repo'))
      };
      vi.mocked(simpleGit)
        .mockReturnValueOnce(mockGit as any)
        .mockReturnValueOnce(pathMockGit as any);

      service = new GitService();
      const result = await service.isRepository('/nonexistent/path');

      expect(result).toBe(false);
    });
  });

  describe('cloneRepository with singleBranch=false', () => {
    it('should not include --single-branch when singleBranch is false', async () => {
      mockGit.clone.mockResolvedValue(undefined);

      await service.cloneRepository('https://github.com/user/repo.git', '/dest', {
        singleBranch: false
      });

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/dest',
        ['--depth', '1']
      );
    });

    it('should include --single-branch when singleBranch is undefined (default)', async () => {
      mockGit.clone.mockResolvedValue(undefined);

      await service.cloneRepository('https://github.com/user/repo.git', '/dest');

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/dest',
        ['--depth', '1', '--single-branch']
      );
    });

    it('should include --single-branch when singleBranch is true', async () => {
      mockGit.clone.mockResolvedValue(undefined);

      await service.cloneRepository('https://github.com/user/repo.git', '/dest', {
        singleBranch: true
      });

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/dest',
        ['--depth', '1', '--single-branch']
      );
    });
  });

  describe('getRemoteUrl returning null', () => {
    it('should return null when remote returns null', async () => {
      mockGit.remote.mockResolvedValue(null);

      const url = await service.getRemoteUrl();

      expect(url).toBeNull();
    });

    it('should return null when remote returns empty string', async () => {
      mockGit.remote.mockResolvedValue('');

      const url = await service.getRemoteUrl();

      expect(url).toBeNull();
    });
  });

  describe('cloneRepository error handling with non-Error', () => {
    it('should handle non-Error thrown values', async () => {
      mockGit.clone.mockRejectedValue('string error');

      await expect(service.cloneRepository('https://github.com/user/repo.git', '/dest'))
        .rejects.toThrow('Failed to clone repository: string error');
    });
  });
});
