import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import CreatePostDto from './dto/createPost.dto';
import Post from './post.entity';
import UpdatePostDto from './dto/updatePost.dto';
import { FindManyOptions, In, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import User from 'src/users/address.entity';
import { PostNotFoundException } from './exception/postNotFund.exception';
import PostsSearchService from './postsSearch.service';

@Injectable()
export default class PostsService {
  private lastPostId = 0;
  private posts: Post[] = [];

  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private postsSearchService: PostsSearchService,
  ) {}

  async getAllPosts(offset?: number, limit?: number, startId?: number) {
    const where: FindManyOptions<Post>['where'] = {};
    let separateCount = 0;
    if (startId) {
      where.id = MoreThan(startId);
      separateCount = await this.postsRepository.count();
    }

    const [items, count] = await this.postsRepository.findAndCount({
      where,
      relations: ['author'],
      order: {
        id: 'ASC',
      },
      skip: offset,
      take: limit,
    });

    return {
      items,
      count: startId ? separateCount : count,
    };
  }

  async getPostById(id: number) {
    const post = await this.postsRepository.findOne(id, {
      relations: ['author'],
    });
    if (post) {
      return post;
    }
    throw new PostNotFoundException(id);
  }

  async createPost(post: CreatePostDto, user: User) {
    const newPost = await this.postsRepository.create({
      ...post,
      author: user,
    });
    await this.postsRepository.save(newPost);
    this.postsSearchService.indexPost(newPost);
    return newPost;
  }

  async updatePost(id: number, post: UpdatePostDto) {
    await this.postsRepository.update(id, post);
    const updatedPost = await this.postsRepository.findOne(id, {
      relations: ['author'],
    });
    if (updatedPost) {
      await this.postsSearchService.update(updatedPost);
      return updatedPost;
    }
    throw new PostNotFoundException(id);
  }

  async deletePost(id: number) {
    const deleteResponse = await this.postsRepository.delete(id);
    if (!deleteResponse.affected) {
      throw new PostNotFoundException(id);
    }
    await this.postsSearchService.remove(id);
  }

  async searchForPosts(
    text: string,
    offset?: number,
    limit?: number,
    startId?: number,
  ) {
    const { results, count } = await this.postsSearchService.search(
      text,
      offset,
      limit,
      startId,
    );
    const ids = results.map((result) => result.id);
    if (!ids.length) {
      return {
        items: [],
        count,
      };
    }
    const items = await this.postsRepository.find({
      where: { id: In(ids) },
    });
    return {
      items,
      count,
    };
  }
}
