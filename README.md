## WebCPU-VM
By hikarupsp(hikalium) 2013-2014 for OSECPU-VM

## これは何？
- OSECPU-VMのJavaScript実装です。

- Gitリポジトリ
  - http://sourceforge.jp/projects/chnosproject/scm/git/AI004/
  - webcpuディレクトリにすべてが入っています。(index.htmlがフロントエンド)
  - webcpuディレクトリ単体で動作します。elcc(OSECPU用コンパイラ)との関係でリポジトリは統合しました
- JavaScriptは、ほとんどの場合ウェブブラウザさえあれば実行できる言語なので、より多くの環境でOSECPUコードを実行させることができます。
- また、HTML5技術(Canvas)と連携することで、ウェブページに直接OSECPUコードを埋め込むこともできるようになるでしょう。
  - これは、テキストを直接転送しているHTMLにとって、データの転送量を削減することにもつながります。

## 動作環境
- 動作を確認している環境は以下の通りです。(app0023フロントエンドコードテキストのStepInMs実行にて確認。)
  - Chrome (Mac OSX, Windows)

- 以下の環境でも動作するかもしれません。
  - Safari (Mac OSX, iOS)
  - Browser (Android)
  - InternetExplorer9 (Windows)

## できるようになったこと
- フロントエンドコードの実行(decoder.oseを利用)
- グラフィック関連APIのmode指定の反映(PSET,OR,XOR,AND等)
- バイナリファイルの直接実行
  - FileAPI対応ブラウザ(Chrome等)が必要です。
## 今はできないこと（できる範囲で実装します）
- 半分くらいのAPI
  -ユーザー入力が必要なAPI
  -メモリ操作が必要なAPI

## 使い方は？
「テストページの操作方法」を参考にしてください。
組み込んで使用する方は、index.htmlのサンプルコードを見ていただければ、だいたいはわかると思います。

### テストページの操作方法

https://hikalium.github.io/webcpu-vm/

1. binaryCodeのところに、バイナリをHex文字列化したものを打ち込む
  - もしくは実行バイナリファイルを直接読み込ませることもできます。
1. コードをLoadする
  - Loadボタンを押すことで、バイナリコードが解釈されてWebCPUで実行可能な状態になります。フロントエンドコードの場合、環境によってはデコードに少し時間がかかるかもしれません。
1. 実行する
  - 実行するときにはいくつかの方法があります。
  - StepIn:ステップ実行します。
  - StepInMs:1ミリ秒ごとに区切って実行します。デバッグ表示をしている間は最速で実行する方法です。
  - StepIn100:100ステップ実行します。
  - Execute:最速で実行します（デバッグモード有効時は使用しない方がよいです）

- デバッグモードについて
  デバッグモード時は、実行中のレジスタ情報と現在実行中の命令について詳細を確認しながら実行できます。
  負荷のかかるアプリケーションを実行する際は、デバッグモードを無効にするのがよいでしょう。

### 技術情報
[OSECPU-Wikiの記事](http://osecpu.osask.jp/wiki/?hikarupsp_WebCPU-VM_internal)を参照してください。


