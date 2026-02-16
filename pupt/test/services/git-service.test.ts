import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitService } from '../../src/services/git-service';
import simpleGit from 'simple-git';

vi.mock('simple-git');

describe('GitService', () => {
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

  describe('isRepository', () => {
    it('should return true for valid git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      
      const result = await service.isRepository();
      
      expect(result).toBe(true);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should return false for non-git directory', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);
      
      const result = await service.isRepository();
      
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockGit.checkIsRepo.mockRejectedValue(new Error('Not a git repo'));
      
      const result = await service.isRepository();
      
      expect(result).toBe(false);
    });
  });

  describe('cloneRepository', () => {
    it('should clone repository successfully', async () => {
      mockGit.clone.mockResolvedValue(undefined);
      
      await service.cloneRepository('https://github.com/user/repo.git', '/path/to/dest');
      
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/path/to/dest',
        ['--depth', '1', '--single-branch']
      );
    });

    it('should clone with custom options', async () => {
      mockGit.clone.mockResolvedValue(undefined);
      
      await service.cloneRepository('https://github.com/user/repo.git', '/path/to/dest', {
        depth: 10,
        branch: 'main'
      });
      
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo.git',
        '/path/to/dest',
        ['--depth', '10', '--branch', 'main', '--single-branch']
      );
    });

    it('should throw error with details on clone failure', async () => {
      mockGit.clone.mockRejectedValue(new Error('Clone failed'));
      
      await expect(service.cloneRepository('invalid-url', '/path')).rejects.toThrow(
        'Failed to clone repository'
      );
    });
  });

  describe('validateGitUrl', () => {
    it('should validate HTTPS URLs', () => {
      expect(() => service.validateGitUrl('https://github.com/user/repo.git')).not.toThrow();
      expect(() => service.validateGitUrl('https://github.com/user/repo')).not.toThrow();
    });

    it('should validate SSH URLs', () => {
      expect(() => service.validateGitUrl('git@github.com:user/repo.git')).not.toThrow();
      expect(() => service.validateGitUrl('ssh://git@github.com/user/repo.git')).not.toThrow();
    });

    it('should validate git protocol URLs', () => {
      expect(() => service.validateGitUrl('git://github.com/user/repo.git')).not.toThrow();
    });

    it('should validate file URLs', () => {
      expect(() => service.validateGitUrl('file:///path/to/repo')).not.toThrow();
    });

    it('should throw for invalid URLs', () => {
      expect(() => service.validateGitUrl('')).toThrow('Invalid URL');
      expect(() => service.validateGitUrl('not-a-url')).toThrow('Invalid git URL format');
      expect(() => service.validateGitUrl('http://example.com')).toThrow('Invalid git URL format');
    });
  });

  describe('extractRepoName', () => {
    it('should extract name from HTTPS URLs', () => {
      expect(service.extractRepoName('https://github.com/user/my-repo.git')).toBe('my-repo');
      expect(service.extractRepoName('https://github.com/user/my-repo')).toBe('my-repo');
    });

    it('should extract name from SSH URLs', () => {
      expect(service.extractRepoName('git@github.com:user/my-repo.git')).toBe('my-repo');
    });

    it('should extract name from file URLs', () => {
      expect(service.extractRepoName('file:///path/to/my-repo')).toBe('my-repo');
    });

    it('should throw for invalid URLs', () => {
      expect(() => service.extractRepoName('')).toThrow('Invalid repository URL');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      mockGit.branch.mockResolvedValue({ current: 'main' });
      
      const branch = await service.getCurrentBranch();
      
      expect(branch).toBe('main');
    });

    it('should return null on error', async () => {
      mockGit.branch.mockRejectedValue(new Error('Not in a git repo'));
      
      const branch = await service.getCurrentBranch();
      
      expect(branch).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return repository status', async () => {
      const mockStatus = {
        modified: ['file1.txt'],
        created: ['file2.txt'],
        deleted: [],
        conflicted: [],
        isClean: () => false
      };
      mockGit.status.mockResolvedValue(mockStatus);
      
      const status = await service.getStatus();
      
      expect(status).toEqual(mockStatus);
    });

    it('should return null on error', async () => {
      mockGit.status.mockRejectedValue(new Error('Not in a git repo'));
      
      const status = await service.getStatus();
      
      expect(status).toBeNull();
    });
  });

  describe('getRemoteUrl', () => {
    it('should return remote URL for origin', async () => {
      mockGit.remote.mockResolvedValue('https://github.com/user/repo.git\n');
      
      const url = await service.getRemoteUrl();
      
      expect(url).toBe('https://github.com/user/repo.git');
      expect(mockGit.remote).toHaveBeenCalledWith(['get-url', 'origin']);
    });

    it('should return remote URL for custom remote', async () => {
      mockGit.remote.mockResolvedValue('https://github.com/user/repo.git\n');
      
      const url = await service.getRemoteUrl('upstream');
      
      expect(url).toBe('https://github.com/user/repo.git');
      expect(mockGit.remote).toHaveBeenCalledWith(['get-url', 'upstream']);
    });

    it('should return null on error', async () => {
      mockGit.remote.mockRejectedValue(new Error('No remote'));
      
      const url = await service.getRemoteUrl();
      
      expect(url).toBeNull();
    });
  });

  describe('pullRepository', () => {
    it('should pull repository successfully', async () => {
      mockGit.pull.mockResolvedValue({ summary: { changes: 1 } });
      
      await service.pullRepository('/path/to/repo');
      
      expect(mockGit.pull).toHaveBeenCalledWith();
    });

    it('should pull with options', async () => {
      mockGit.pull.mockResolvedValue({ summary: { changes: 1 } });
      
      await service.pullRepository('/path/to/repo', {
        remote: 'upstream',
        branch: 'main'
      });
      
      expect(mockGit.pull).toHaveBeenCalledWith('upstream', 'main');
    });

    it('should throw error on pull failure', async () => {
      mockGit.pull.mockRejectedValue(new Error('Pull failed'));
      
      await expect(service.pullRepository('/path')).rejects.toThrow(
        'Failed to pull repository'
      );
    });
  });
});