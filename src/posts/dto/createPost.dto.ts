import { IsNotEmpty, IsString } from 'class-validator';

export default class CreatePostDto {
  @IsString({ each: true })
  @IsNotEmpty()
  paragraphs: string[];

  content: string;
  title: string;
}
