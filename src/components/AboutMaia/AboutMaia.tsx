import Image from 'next/image'
import { useEffect } from 'react'
import styles from './AboutMaia.module.scss'
import { draw_all_plots, destroy_all_charts } from './plots'
import maia_diagram_transparent from './maia-diagram_transparent.png'
import maia_transfer_val_accs from './maia_transfer_val_accs.svg'
import personReid from './people/reid.jpg'
import personAshton from './people/ashton.jpeg'
import personJon from './people/jon.jpg'
import personSid from './people/sid.jpeg'
import personRussel from './people/russell.jpg'
import personJoseph from './people/joseph.jpg'
import personIsaac from './people/isaac.jpg'
import personDmitriy from './people/dmitriy.jpg'
import personKevin from './people/kevin.jpg'
import example_board from './example_board.png'

import { EnvelopeSquareIcon, GithubIcon } from 'src/components/Icons/icons'

export const AboutMaia = () => {
  useEffect(() => {
    draw_all_plots()
    return () => destroy_all_charts()
  })

  return (
    <div className={styles.homepage}>
      <div className="flex flex-row items-center justify-center gap-10 bg-white py-5 text-sm uppercase tracking-wider text-black">
        <a href="#main_info">Project</a>
        <a href="#paper">Paper</a>
        <a href="#data">Data</a>
        <a href="#team">Team</a>
        <a
          id="#code"
          target="_blank"
          rel="noreferrer"
          href="https://github.com/CSSLab/maia-chess"
          className="flex flex-row items-center justify-start gap-2"
        >
          <i className="flex [&>*]:!fill-black">{GithubIcon}</i>{' '}
          <span>Code</span>
        </a>
        <a
          id="#email"
          target="_blank"
          rel="noreferrer"
          href="https://forms.gle/jaQfzSGmaeMcu2UA7"
          className="flex flex-row items-center justify-start gap-2"
        >
          <i className="flex text-black [&>*]:!fill-black">
            {EnvelopeSquareIcon}
          </i>{' '}
          <span>Email list</span>
        </a>
      </div>
      <section id="main_info" className={styles.lightSection}>
        <div className={styles.container}>
          <div className={styles.row}>
            <div className={styles.col8}>
              <h3>Capturing human style in chess</h3>
              <div className={styles.graphContainer}>
                <canvas id="maia_bars" />
              </div>
              <p>
                Maia&rsquo;s goal is to play the <b>human</b> move — not
                necessarily the best move. As a result, Maia has a more
                human-like style than previous engines, matching moves played by
                human players in online games over 50% of the time.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <div className={styles.row}>
            <div className={styles.col6}>
              <figure>
                <Image
                  src={maia_diagram_transparent}
                  alt="observer diagram"
                  className="observer-diagram"
                />
                <figcaption>
                  During training, Maia is given a position that occurred in a
                  real human game and tries to predict which move was made.
                  After seeing hundreds of millions of positions, Maia
                  accurately captures how people at different levels play chess.
                </figcaption>
              </figure>
            </div>
            <div className={styles.col6}>
              <p>
                {' '}
                Maia is an AlphaZero/Leela-like deep learning framework that
                learns from online human games instead of self-play. Maia is
                trained on millions of games, and tries to predict the human
                move played in each position seen.
              </p>
              <p>
                We trained 9 versions of Maia, one for each Elo milestone
                between 1100 and 1900. Maia 1100 was only trained on games
                between 1100-rated players, and so on. Each version learned from
                12 million human games, and learns how chess is typically played
                at its specific level.
              </p>
              <p />
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <div className={styles.row}>
            <div className={styles.col4}>
              <p>
                We measure “move-matching accuracy”, how often Maia&rsquo;s
                predicted move is the same as the human move played in real
                online games.
              </p>
              <p>
                Because we trained 9 different versions of Maia, each at a
                targeted skill level, we can begin to algorithmically capture
                what kinds of mistakes players at specific skill levels make
                &ndash; and when people stop making them.{' '}
              </p>
              <p>
                In this example, the Maias predict that people stop playing the
                tempting but wrong move <i>b6</i> at around 1500.{' '}
              </p>
            </div>
            <div className={styles.col8}>
              <figure>
                <Image src={example_board} alt="example board" />
                <figcaption>
                  In this position, Maia levels 1100&ndash;1400 correctly
                  predict that White will play the tempting but wrong move b6
                  (the move played in the game). It threatens the Queen, but
                  after …Qxc5 White&rsquo;s big advantage is mostly gone. Maia
                  levels 1500&ndash;1900 predict that, on average, players rated
                  1500 and above will play the correct bxa6, forcing the
                  Queenside open to decisive effect.
                </figcaption>
              </figure>
            </div>
            {/*
    <iframe  class='widget_embed' src="https://csslab.github.io/Maia-Agreement-Visualizer"></iframe>*/}
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <h3>Maia captures human style at targeted skill levels</h3>
          <div className={styles.row}>
            <div className={styles.col6}>
              <div className={styles.graphContainer}>
                <canvas id="maia_lines" className="line_plot" />
              </div>
            </div>
            <div className={styles.col6}>
              <div className="text_column">
                <p>
                  We tested each Maia on 9 sets of 500,000 positions that arose
                  in real human games, one for each rating level between 1100
                  and 1900. Every Maia made a prediction for every position, and
                  we measured its resulting move-matching accuracy on each set.{' '}
                </p>
                {/* <p><b> Maia captures human style at its specified skill level</b></p> */}
                <p>
                  Each Maia captures human style at its targeted skill level.
                  Lower Maias best predict moves played by lower-rated players,
                  whereas higher Maias predict moves made by higher-rated
                  players.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <div className={styles.row}>
            <div className={styles.col6}>
              <div className={styles.graphContainer}>
                <canvas id="all_lines" className="line_plot" />
              </div>
            </div>
            <div className={styles.col6}>
              <div className="text_column">
                <p>
                  As a comparison, we looked at how depth-limited Stockfish does
                  on the same prediction task. We ran various depth limits,
                  ranging from only considering the current board (D01) to
                  letting it search 15 plies ahead (D15). Depth-limited
                  Stockfish is the most popular engine to play against for fun
                  (e.g. the &quot;Play with the Computer&quot; feature on
                  Lichess).
                </p>
                <p>
                  We also compared against a variety of Leela chess models,
                  ranging from the very weak 800-rated version to a 3200-rating
                  version.
                </p>
                <p>
                  Stockfish and Leela models don&apos;t predict human moves as
                  well as Maia. Equally importantly, they don&apos;t match a
                  targeted skill level: the curves in the graph are relatively
                  flat across a wide range of human skill levels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <h3>Predicting mistakes</h3>
          <div className={styles.row}>
            <div className={styles.col6}>
              <div className={styles.graphContainer}>
                <canvas id="data_delta" className="line_plot" />
              </div>
            </div>
            <div className={styles.col6}>
              <div className="text_column">
                <p>
                  {' '}
                  Maia is particularly good at predicting human mistakes. The
                  move-matching accuracy of any model increases with the quality
                  of the move, since good moves are easier to predict. But even
                  when players make horrific blunders, Maia correctly predicts
                  the exact blunder they make around 25% of the time. This
                  ability to understand how and when people are likely to make
                  mistakes can make Maia a very useful learning tool.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <h3>Personalizing to Individual Players</h3>
          <div className={styles.row}>
            <div className={styles.col6}>
              <figure>
                <Image src={maia_transfer_val_accs} alt="Transfer Maia" />
                <figcaption>
                  By targeting a specific player we can get even higher move
                  prediction accuracy compared to Maias targeting just the
                  player&apos;s rating.
                </figcaption>
              </figure>
            </div>
            <div className={styles.col6}>
              <div className="text_column">
                <p>
                  Next, we tried pushing the modeling of human play to the next
                  level: could we predict the moves a <i>particular</i> human
                  player would make? It turns out that personalizing Maia gives
                  us our biggest performance gains. We achieve these results by
                  fine-tuning Maia: starting with a base Maia, say Maia 1900, we
                  update the model by continuing training on an individual
                  player&rsquo;s games. This plot shows that personalized Maias
                  achieve up to 65% accuracy at predicting particular
                  players&apos; moves.
                </p>
                <p>
                  The paper for this work is available{' '}
                  <a
                    href="https://www.cs.toronto.edu/~ashton/pubs/maia-individual-kdd2022.pdf"
                    title="Link to individual Maia paper"
                  >
                    here
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <h3>Play Maia and more</h3>
          {/* <div class="col-lg-10 "> */}
          <p>
            You can play against Maia yourself on Lichess! You can play{' '}
            <a href="https://lichess.org/@/maia1">Maia 1100</a>,{' '}
            <a href="https://lichess.org/@/maia5">Maia 1500</a>, and{' '}
            <a href="https://lichess.org/@/maia9">Maia 1900</a>.
          </p>
          <p>
            Maia is an ongoing research project using chess as a case study for
            how to design better human-AI interactions. We hope Maia becomes a
            useful learning tool and is fun to play against. Our research goals
            include personalizing Maia to individual players, characterizing the
            kinds of mistakes that are made at each rating level, running Maia
            on your games and spotting repeated, predictable mistakes, and more.
          </p>
          <p>
            This is work in progress and we&rsquo;d love to hear what you think.
            Please let us know if you have any feedback or questions by{' '}
            <a href="mailto:maiachess@cs.toronto.edu">email</a> or{' '}
            <a href="https://twitter.com/maiachess">Twitter</a>.
          </p>
          {/* </div> */}
          {/* <div class="row">
  <div class="col-lg-4 col-lg-offset-2">
    <h4>Our models are on Lichess</h4>
    <table class="table models_table">
      <tr>
        <th>Name</th>
        <th>Trained Rating</th>
      </tr>
      <tr>
        <td class="model_name"><a href="https://lichess.org/@/maia1">maia1</a></td>
        <td class="model_rating">1100</td>
      </tr>
      <tr>
        <td class="model_name"><a href="https://lichess.org/@/maia5">maia5</a></td>
        <td class="model_rating">1500</td>
      </tr>
      <tr>
        <td class="model_name"><a href="https://lichess.org/@/maia9">maia9</a></td>
        <td class="model_rating">1900</td>
      </tr>
    </table>
  </div>
      <div class="col-lg-6">
  
  <h4>Please get in touch</h4>
  
      </div> */}
        </div>
        {/* <div class="row closing-remark">
  
      </div> */}
      </section>
      <section id="paper" className={styles.lightSection}>
        {/* <section id="paper" className="content-section dark-section"> */}
        <div className={styles.container}>
          <div className="row col-lg-9 col-lg-offset-2 left-justify-section">
            <h2>paper</h2>
            <p>
              {' '}
              Read the full{' '}
              <a href="https://arxiv.org/abs/2006.01855">
                research paper on Maia
              </a>
              , which was published in the{' '}
              <i>
                2020 ACM SIGKDD International Conference on Knowledge Discovery
                and Data Mining (KDD 2020)
              </i>
              .
            </p>
            <p>
              You can read a blog post about Maia{' '}
              <a href="http://csslab.cs.toronto.edu/blog/2020/08/24/maia_chess_kdd/">
                from the Computational Social Science Lab
              </a>{' '}
              or{' '}
              <a href="https://www.microsoft.com/en-us/research/blog/the-human-side-of-ai-for-chess">
                Microsoft Research
              </a>
              .
            </p>
            <p>
              {' '}
              We are going to be releasing beta versions of learning tools,
              teaching aids, and experiments based on Maia (analyses of your
              games, personalized puzzles, Turing tests, etc.). If you want to
              be the first to know, you can sign up for our email list{' '}
              <a
                href="https://forms.gle/jaQfzSGmaeMcu2UA7"
                title="Email signup list"
              >
                here
              </a>
              .
            </p>
            <p>
              {' '}
              If you want to see some more examples of Maia&apos;s predictions
              we have a tool{' '}
              <a
                href="https://csslab.github.io/Maia-Agreement-Visualizer/"
                title="Link to interactive prediction visualizer"
              >
                here
              </a>{' '}
              to see where the different models disagree.
            </p>
            <p>
              The code for training Maia can be found on our{' '}
              <a href="https://github.com/CSSLab/maia-chess">Github Repo</a>.
            </p>
            <h4>Abstract</h4>
            <p className="abstract">
              As artificial intelligence becomes increasingly intelligent--in
              some cases, achieving superhuman performance--there is growing
              potential for humans to learn from and collaborate with
              algorithms. However, the ways in which AI systems approach
              problems are often different from the ways people do, and thus may
              be uninterpretable and hard to learn from. A crucial step in
              bridging this gap between human and artificial intelligence is
              modeling the granular actions that constitute human behavior,
              rather than simply matching aggregate human performance. We pursue
              this goal in a model system with a long history in artificial
              intelligence: chess. The aggregate performance of a chess player
              unfolds as they make decisions over the course of a game. The
              hundreds of millions of games played online by players at every
              skill level form a rich source of data in which these decisions,
              and their exact context, are recorded in minute detail. Applying
              existing chess engines to this data, including an open-source
              implementation of AlphaZero, we find that they do not predict
              human moves well. We develop and introduce Maia, a customized
              version of Alpha-Zero trained on human chess games, that predicts
              human moves at a much higher accuracy than existing engines, and
              can achieve maximum accuracy when predicting decisions made by
              players at a specific skill level in a tuneable way. For a dual
              task of predicting whether a human will make a large mistake on
              the next move, we develop a deep neural network that significantly
              outperforms competitive baselines. Taken together, our results
              suggest that there is substantial promise in designing artificial
              intelligence systems with human collaboration in mind by first
              accurately modeling granular human decision-making.
            </p>
            {/*<h3>BibTex</h3>
  <code>@inproceedings{mcilroyyoung2020maia,
  title={Aligning Superhuman AI with Human Behavior: Chess as a Model System},
  author={McIlroy-Young, Reid and Sen, Siddhartha and Kleinberg, Jon and Anderson, Ashton},
  year={2020},
  booktitle={Proceedings of the 25th ACM SIGKDD international conference on Knowledge discovery and data mining}
  }</code>
  */}
          </div>
        </div>
      </section>
      <section id="data" className={styles.lightSection}>
        <div className={styles.container}>
          <div className="row col-lg-8 col-lg-offset-2 left-justify-section">
            <h2>Data</h2>
            <p>
              {' '}
              All our data is from the wonderful archive at{' '}
              <a href="https://database.lichess.org/">database.lichess.org</a>.
              We converted the raw PGN raw data dumps into CSV, and have made
              the CSV we used for testing available at{' '}
              <a href="http://csslab.cs.toronto.edu/datasets/#maia_kdd">
                csslab.cs.toronto.edu/datasets
              </a>
              .
            </p>
            {/* <p>If you want the full dataset we used for training the models please get in touch</p> */}
          </div>
        </div>
      </section>
      <section id="team" className={styles.lightSection}>
        {/* <section id="team" className="content-section"> */}
        <div className={styles.container}>
          <div className="row col-lg-10 col-lg-offset-1">
            <h2>Team</h2>
            <div className={styles.peopleList}>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personAshton}
                    alt="Picture of Ashton Anderson"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="http://www.cs.toronto.edu/~ashton/">
                    Ashton Anderson
                  </a>
                </div>
                <div className={styles.affiliation}>
                  <p>University of Toronto</p>
                </div>
                <div className={styles.role}>
                  <p>Project Lead</p>
                </div>
                {/* <div className={styles.personLine}>
                  <div className={styles.personLink}>
                    <a href="http://www.cs.toronto.edu/~ashton/">
                      <i
                        className="fas fa-external-link-alt"
                        title="Ashton Anderson website link"
                      />
                    </a>
                  </div>
                  <div className={styles.personLink}>
                    <a href="https://www.twitter.com/ashton1anderson">
                      <i
                        className="fab fa-twitter"
                        title="Ashton Anderson Twitter link"
                      />
                    </a>
                  </div>
                  <div className={styles.personLink}>
                    <a href="https://github.com/ashtonanderson">{GithubIcon}</a>
                  </div>
                </div> */}
              </div>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personReid}
                    alt="Picture of Reid McIlroy-Young"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="https://reidmcy.com">Reid McIlroy-Young</a>
                </div>
                <div className={styles.affiliation}>
                  <p>University of Toronto</p>
                </div>
                <div className={styles.role}>
                  <p>Head Developer</p>
                </div>
                {/* <div className={styles.personLine}>
                  <div className={styles.personLink}>
                    <a href="https://reidmcy.com">
                      <i
                        className="fas fa-external-link-alt"
                        title="Reid McIlroy-Young website link"
                      />
                    </a>
                  </div>
                  <div className={styles.personLink}>
                    <a href="https://www.twitter.com/reidmcy">
                      <i
                        className="fab fa-twitter"
                        title="Reid McIlroy-Young Twitter link"
                      />
                    </a>
                  </div>
                  <div className={styles.personLink}>
                    <a href="https://github.com/reidmcy">{GithubIcon}</a>
                  </div>
                </div> */}
              </div>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personJon}
                    alt="Picture of Jon Kleinberg"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="http://www.cs.cornell.edu/home/kleinber">
                    Jon Kleinberg
                  </a>
                </div>
                <div className={styles.affiliation}>
                  <p>Cornell University</p>
                </div>
                <div className={styles.role}>
                  <p>Collaborator</p>
                </div>
                {/* <div className={styles.personLine}>
                  <div className={styles.personLink}>
                    <a href="http://www.cs.cornell.edu/home/kleinber">
                      <i
                        className="fas fa-external-link-alt"
                        title="Jon Kleinberg website link"
                      />
                    </a>
                  </div>
                </div> */}
              </div>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personSid}
                    alt="Picture of Siddhartha Sen"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="http://sidsen.org">Siddhartha Sen</a>
                </div>
                <div className={styles.affiliation}>
                  <p>Microsoft Research</p>
                </div>
                <div className={styles.role}>
                  <p>Collaborator</p>
                </div>
                {/* <div className={styles.personLine}>
                  <div className={styles.personLink}>
                    <a href="http://sidsen.org">
                      <i
                        className="fas fa-external-link-alt"
                        title="Siddhartha Sen website link"
                      />
                    </a>
                  </div>
                  <div className={styles.personLink}>
                    <a href="https://github.com/sidsen">{GithubIcon}</a>
                  </div>
                </div> */}
              </div>
              {/* <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personRussel}
                    alt="Picture of Russell Wang"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href=" https://github.com/rwang97">Russell Wang</a>
                </div>
                <div className={styles.affiliation}>
                  <p className="affiliation">University of Toronto</p>
                </div>
                <div className={styles.role}>
                  <p>Developer</p>
                </div> */}
              {/* <div className={styles.personLine}>
                  <div className={styles.personLink}>
                    <a href="https://www.twitter.com/rwang97">
                      <i
                        className="fab fa-twitter"
                        title="Russell Wang Twitter link"
                      />
                    </a>
                  </div>
                  <div className={styles.personLink}>
                    <a href="https://github.com/rwang97">{GithubIcon}</a>
                  </div>
                </div>
              </div>  */}
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personJoseph}
                    alt="Picture of Joseph Tang"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="https://lilv98.github.io/">Joseph Tang</a>
                </div>
                <div className={styles.affiliation}>
                  <p className="affiliation">University of Toronto</p>
                </div>
                <div className={styles.role}>
                  <p>Model Developer</p>
                </div>
              </div>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    src={personIsaac}
                    className={styles.personImage}
                    alt="Picture of Isaac Waller"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="https://waller.is/">Isaac Waller</a>
                </div>
                <div className={styles.affiliation}>
                  <p className="affiliation">University of Toronto</p>
                </div>
                <div className={styles.role}>
                  <p>Web Developer</p>
                </div>
              </div>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personDmitriy}
                    alt="Picture of Dmitriy Prokopchuk"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="https://prokopchukdim.github.io/">
                    Dmitriy Prokopchuk
                  </a>
                </div>
                <div className={styles.affiliation}>
                  <p className="affiliation">University of Toronto</p>
                </div>
                <div className={styles.role}>
                  <p>Web Developer</p>
                </div>
              </div>
              <div className={styles.person}>
                <div className={styles.personLine}>
                  <Image
                    className={styles.personImage}
                    src={personKevin}
                    alt="Picture of Kevin Thomas"
                  />
                </div>
                <div className={styles.personLine}>
                  <a href="https://kevinjosethomas.com/">Kevin Thomas</a>
                </div>
                <div className={styles.affiliation}>
                  <p className="affiliation">Burnaby South Secondary</p>
                </div>
                <div className={styles.role}>
                  <p>Web Developer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className={styles.lightSection}>
        <div className={styles.container}>
          <div className={styles.col8}>
            <h2>Acknowledgments</h2>
            <p>
              Many thanks to Lichess.org for providing the human games that we
              trained on and hosting our Maia models that you can play against.
              Ashton Anderson was supported in part by an NSERC grant, a
              Microsoft Research gift, and a CFI grant. Jon Kleinberg was
              supported in part by a Simons Investigator Award, a Vannevar Bush
              Faculty Fellowship, a MURI grant, and a MacArthur Foundation
              grant.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
